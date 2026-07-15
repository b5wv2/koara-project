const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');

// We use express.raw to ensure we have the exact payload body for HMAC signature verification
router.post('/fazercards', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const rawBody = req.body;
    const signature = req.headers['x-fazercards-signature'];
    const secret = process.env.WEBHOOK_SECRET;

    if (!secret) {
      console.error('[WEBHOOK] WEBHOOK_SECRET is not configured.');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!signature) {
      console.error('[WEBHOOK] Missing X-FazerCards-Signature header.');
      return res.status(401).json({ error: 'Missing signature' });
    }

    // Compute HMAC SHA256 signature
    const hmac = crypto.createHmac('sha256', secret);
    const computedSignature = hmac.update(rawBody).digest('hex');

    const signatureBuffer = Buffer.from(signature);
    const computedSignatureBuffer = Buffer.from(computedSignature);

    let signatureValid = false;
    if (signatureBuffer.length === computedSignatureBuffer.length) {
      signatureValid = crypto.timingSafeEqual(signatureBuffer, computedSignatureBuffer);
    }

    // Parse the payload securely now that we have the raw body
    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch (err) {
      console.error('[WEBHOOK] Invalid JSON payload received.');
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    const eventType = payload.type;
    const providerOrderId = payload.order?.id;
    const reason = payload.reason || '';

    console.log(`\n--- Webhook Received: FazerCards ---`);
    console.log(`Event: ${eventType}, Provider Order ID: ${providerOrderId}`);
    console.log(`Signature Valid: ${signatureValid}`);
    console.log(`-----------------------------------\n`);

    // 13. Store webhook in webhook_logs before processing
    let logId;
    try {
      const logRes = await db.query(`
        INSERT INTO webhook_logs (provider, event_type, provider_order_id, signature_valid, raw_payload)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, ['FazerCards', eventType, providerOrderId, signatureValid, JSON.stringify(payload)]);
      logId = logRes.rows[0].id;
    } catch (dbErr) {
      console.error('[WEBHOOK] Failed to log webhook to DB:', dbErr.message);
      // Even if logging fails, we should arguably reject it if we can't store it, 
      // but let's just proceed to respond 500 so they retry.
      return res.status(500).json({ error: 'Failed to log webhook' });
    }

    if (!signatureValid) {
      await db.query(`UPDATE webhook_logs SET processing_result = 'Invalid signature' WHERE id = $1`, [logId]);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 11. Return HTTP 200 immediately after successful verification
    res.status(200).send('OK');

    // Process the webhook asynchronously
    (async () => {
      try {
        if (!providerOrderId) {
          await db.query(`UPDATE webhook_logs SET processing_result = 'Missing provider order ID in payload' WHERE id = $1`, [logId]);
          return;
        }

        // 8. Map the order status
        let newStatus;
        if (eventType === 'order.completed') newStatus = 'completed';
        else if (eventType === 'order.failed') newStatus = 'failed';
        else if (eventType === 'order.refunded') newStatus = 'refunded';
        else {
          await db.query(`UPDATE webhook_logs SET processing_result = $1 WHERE id = $2`, [`Ignored unknown event type: ${eventType}`, logId]);
          return;
        }

        // 7. Find the correct Koara order using provider_order_id
        const orderRes = await db.query('SELECT * FROM topup_orders WHERE provider_order_id = $1', [providerOrderId]);
        
        if (orderRes.rows.length === 0) {
          await db.query(`UPDATE webhook_logs SET processing_result = 'Order not found in topup_orders' WHERE id = $1`, [logId]);
          console.warn(`[WEBHOOK] Order with provider ID ${providerOrderId} not found.`);
          return;
        }

        const order = orderRes.rows[0];
        const previousStatus = order.status;

        // 9. Ignore duplicate webhook deliveries safely (idempotent processing)
        if (previousStatus === newStatus) {
          await db.query(`UPDATE webhook_logs SET processing_result = $1 WHERE id = $2`, [`Ignored: Order already in status ${newStatus}`, logId]);
          console.log(`[WEBHOOK] Ignored duplicate event for Koara Order ${order.local_order_id} (already ${newStatus})`);
          return;
        }

        // 8. Update the order
        const completedAtSql = newStatus === 'completed' ? 'CURRENT_TIMESTAMP' : 'completed_at'; // retain old value if not completed, or update if completed
        
        await db.query(`
          UPDATE topup_orders 
          SET status = $1, provider_status = $2, updated_at = CURRENT_TIMESTAMP, 
              completed_at = CASE WHEN CAST($1 AS VARCHAR) = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
          WHERE id = $3
        `, [newStatus, eventType, order.id]);

        const resultMsg = `Successfully updated Koara Order ${order.local_order_id} from ${previousStatus} to ${newStatus}`;
        await db.query(`UPDATE webhook_logs SET processing_result = $1 WHERE id = $2`, [resultMsg, logId]);
        
        // 10. Log every received webhook outcome
        console.log(`[WEBHOOK-SUCCESS] Event: ${eventType} | Provider ID: ${providerOrderId} | Koara ID: ${order.local_order_id} | ${previousStatus} -> ${newStatus} | SigValid: true`);
        
      } catch (procErr) {
        console.error('[WEBHOOK] Error processing webhook:', procErr);
        await db.query(`UPDATE webhook_logs SET processing_result = $1 WHERE id = $2`, [`Error: ${procErr.message}`, logId]).catch(e => console.error(e));
      }
    })();

  } catch (error) {
    console.error('[WEBHOOK] Critical error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

module.exports = router;
