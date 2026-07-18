const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const fazerCardsProvider = require('../services/providers/fazerCardsProvider');
const encryption = require('../utils/encryption');
const emailService = require('../services/emailService');

// We use express.raw to ensure we have the exact payload body for HMAC signature verification
router.post('/fazercards', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const rawBody = req.body;
    console.log('[WEBHOOK] All Request Headers:', req.headers);

    const headerWebhookSignature = req.headers['x-webhook-signature'];
    const headerFazerCardsSignature = req.headers['x-fazercards-signature'];
    const signatureRaw = headerWebhookSignature || headerFazerCardsSignature;
    const secret = process.env.WEBHOOK_SECRET;

    if (!secret) {
      console.error('[WEBHOOK] WEBHOOK_SECRET is not configured.');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!signatureRaw) {
      console.error('[WEBHOOK] Missing signature header. Expected X-Webhook-Signature or X-FazerCards-Signature.');
      return res.status(401).json({ error: 'Missing signature' });
    }

    if (headerWebhookSignature) {
      console.log('[WEBHOOK] Received signature via X-Webhook-Signature header');
    } else if (headerFazerCardsSignature) {
      console.log('[WEBHOOK] Received signature via X-FazerCards-Signature header');
    }

    let signature = signatureRaw;
    if (signature.startsWith('sha256=')) {
      signature = signature.substring(7);
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

    console.log('[WEBHOOK] Raw Payload:', JSON.stringify(payload, null, 2));

    const eventType = payload.event;
    const providerOrderId = payload.data?.order_id;
    const providerStatus = payload.data?.status;
    const reason = payload.data?.reason || '';

    console.log(`\n--- Webhook Received: FazerCards ---`);
    console.log(`Event: ${eventType}, Provider Order ID: ${providerOrderId}, Provider Status: ${providerStatus}`);
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
        if (eventType === 'order.status_changed') {
          newStatus = providerStatus; // payload.data.status
        } else {
          await db.query(`UPDATE webhook_logs SET processing_result = $1 WHERE id = $2`, [`Ignored unknown event type: ${eventType}`, logId]);
          return;
        }

        // 7. Find the correct Koara order using provider_order_id
        const orderRes = await db.query('SELECT * FROM topup_orders WHERE provider_order_id = $1', [providerOrderId]);
        
        if (orderRes.rows.length === 0) {
          // Check if it is a Gift Card order in the `orders` table
          const gcOrderRes = await db.query('SELECT * FROM orders WHERE provider_order_id = $1', [providerOrderId]);
          if (gcOrderRes.rows.length === 0) {
            await db.query(`UPDATE webhook_logs SET processing_result = 'Order not found in topup_orders or orders' WHERE id = $1`, [logId]);
            console.warn(`[WEBHOOK] Order with provider ID ${providerOrderId} not found.`);
            return;
          }

          // --- Process Gift Card Order ---
          const gcOrder = gcOrderRes.rows[0];
          const previousStatus = gcOrder.status;

          if (previousStatus === newStatus) {
            await db.query(`UPDATE webhook_logs SET processing_result = $1 WHERE id = $2`, [`Ignored: Gift Card Order already in status ${newStatus}`, logId]);
            console.log(`[WEBHOOK] Ignored duplicate event for Koara Gift Card Order ${gcOrder.order_number} (already ${newStatus})`);
            return;
          }

          if (newStatus === 'completed') {
            try {
              console.log(`[WEBHOOK-GC] Fetching encrypted PIN code for provider order ${providerOrderId}...`);
              const getOrderRes = await fazerCardsProvider.getOrder(providerOrderId);
              let extractedCode = null;

              if (getOrderRes && getOrderRes.success) {
                const orderObj = getOrderRes.order || getOrderRes.raw_response?.order || {};
                const payloadObj = getOrderRes.payload || orderObj.payload || getOrderRes.raw_response?.payload || {};
                const cardsArray = payloadObj.cards || orderObj.cards || getOrderRes.raw_response?.cards;

                if (Array.isArray(cardsArray) && cardsArray.length > 0) {
                  const firstCard = cardsArray[0];
                  if (typeof firstCard === 'string') {
                    extractedCode = firstCard;
                  } else if (typeof firstCard === 'object' && firstCard !== null) {
                    if (firstCard.code && firstCard.pin) {
                      extractedCode = `${firstCard.code} (PIN: ${firstCard.pin})`;
                    } else if (firstCard.pin || firstCard.code || firstCard.voucher_code) {
                      extractedCode = firstCard.pin || firstCard.code || firstCard.voucher_code;
                    } else {
                      extractedCode = JSON.stringify(firstCard);
                    }
                  } else {
                    extractedCode = String(firstCard);
                  }
                } else if (payloadObj.pin || payloadObj.code || payloadObj.voucher_code) {
                  extractedCode = payloadObj.pin || payloadObj.code || payloadObj.voucher_code;
                } else if (orderObj.pin || orderObj.code || orderObj.voucher_code) {
                  extractedCode = orderObj.pin || orderObj.code || orderObj.voucher_code;
                } else if (typeof payloadObj === 'string') {
                  extractedCode = payloadObj;
                }
              }

              if (!extractedCode) {
                throw new Error(`Failed to extract gift card code from provider response: ${JSON.stringify(getOrderRes)}`);
              }

              console.log('[WEBHOOK-GC] Gift card extracted successfully');

              console.log('[WEBHOOK-GC] Encrypting gift card');
              const encryptedCode = encryption.encrypt(extractedCode);

              console.log('[WEBHOOK-GC] Saving encrypted code');
              await db.query(`
                UPDATE orders 
                SET status = $1, provider_status = $2, encrypted_card_code = $3, updated_at = CURRENT_TIMESTAMP, 
                    completed_at = CURRENT_TIMESTAMP
                WHERE id = $4
              `, [newStatus, providerStatus, encryptedCode, gcOrder.id]);

              const storeRes = await db.query('SELECT store_name FROM stores WHERE id = $1', [gcOrder.store_id]);
              const storeName = storeRes.rows[0]?.store_name || 'Koara Store';

              console.log('[WEBHOOK-GC] Sending customer email');
              const emailSent = await emailService.sendEmail(
                gcOrder.customer_email,
                `تم اكتمال طلبك - ${storeName}`,
                'giftcard-completed-customer.html',
                {
                  STORE_NAME: storeName,
                  KOARA_ORDER_ID: gcOrder.order_number,
                  DECRYPTED_CARD_CODE: extractedCode
                }
              );

              if (!emailSent) {
                throw new Error(`Email provider failed to deliver email to ${gcOrder.customer_email} for order ${gcOrder.order_number}`);
              }

              console.log('[WEBHOOK-GC] Customer email sent successfully');

              const resultMsg = `Successfully completed Koara Gift Card Order ${gcOrder.order_number}`;
              await db.query(`UPDATE webhook_logs SET processing_result = $1 WHERE id = $2`, [resultMsg, logId]);
              console.log(`[WEBHOOK-SUCCESS] Event: ${eventType} | Provider ID: ${providerOrderId} | GiftCard ID: ${gcOrder.order_number} | ${previousStatus} -> completed | SigValid: true`);
              return;
            } catch (gcErr) {
              console.error('[WEBHOOK-GC] Fulfillment step failed:', gcErr.message);
              console.error(gcErr.stack || gcErr);
              await db.query(`UPDATE webhook_logs SET processing_result = $1 WHERE id = $2`, [`Error in GC completion: ${gcErr.message}`, logId]).catch(e => console.error(e));
              throw gcErr;
            }
          } else if (newStatus === 'failed' || newStatus === 'rejected') {
            const costPrice = parseFloat(gcOrder.cost_price || 0);
            if (costPrice > 0) {
              const refundClient = await db.pool.connect();
              try {
                await refundClient.query('BEGIN');
                await refundClient.query('UPDATE stores SET balance = balance + $1 WHERE id = $2', [costPrice, gcOrder.store_id]);
                await refundClient.query(`
                  INSERT INTO wallet_transactions (store_id, amount, transaction_type, reason)
                  VALUES ($1, $2, 'credit', $3)
                `, [gcOrder.store_id, costPrice, `Refund due to FazerCards webhook failure for Order ${gcOrder.order_number}`]);
                await refundClient.query('COMMIT');
              } catch (e) {
                if (refundClient) await refundClient.query('ROLLBACK');
                console.error('[WEBHOOK-GC-REFUND-ERROR]', e.message);
              } finally {
                if (refundClient) refundClient.release();
              }
            }

            await db.query(`
              UPDATE orders 
              SET status = 'rejected', provider_status = $1, updated_at = CURRENT_TIMESTAMP
              WHERE id = $2
            `, [providerStatus, gcOrder.id]);

            const resultMsg = `Rejected Koara Gift Card Order ${gcOrder.order_number} cleanly due to provider failure`;
            await db.query(`UPDATE webhook_logs SET processing_result = $1 WHERE id = $2`, [resultMsg, logId]);
            console.log(`[WEBHOOK-SUCCESS] Event: ${eventType} | Provider ID: ${providerOrderId} | GiftCard ID: ${gcOrder.order_number} | ${previousStatus} -> rejected`);
            return;
          } else {
            await db.query(`
              UPDATE orders 
              SET status = $1, provider_status = $2, updated_at = CURRENT_TIMESTAMP
              WHERE id = $3
            `, [newStatus, providerStatus, gcOrder.id]);
            const resultMsg = `Updated Koara Gift Card Order ${gcOrder.order_number} to ${newStatus}`;
            await db.query(`UPDATE webhook_logs SET processing_result = $1 WHERE id = $2`, [resultMsg, logId]);
            return;
          }
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
        await db.query(`
          UPDATE topup_orders 
          SET status = $1, provider_status = $2, updated_at = CURRENT_TIMESTAMP, 
              completed_at = CASE WHEN CAST($1 AS VARCHAR) = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
          WHERE id = $3
        `, [newStatus, providerStatus, order.id]);

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
