const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');

// POST /api/payments/nowpayments/invoice
router.post('/nowpayments/invoice', async (req, res) => {
  const { store_id, amount } = req.body;

  if (!store_id || amount === undefined || amount === null || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'store_id is required and amount must be greater than 0' });
  }

  try {
    const orderId = `INV-${store_id}-${Date.now()}`;
    const invoiceData = {
      price_amount: amount,
      price_currency: 'usd',
      order_id: orderId,
      order_description: 'Koara Wallet Top-up',
      success_url: 'https://www.getkoara.com/payment/success',
      cancel_url: 'https://www.getkoara.com/payment/cancel'
    };

    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoiceData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('NOWPayments error:', data);
      return res.status(500).json({ error: 'Failed to create invoice' });
    }

    // Insert into crypto_invoices
    await db.query(
      `INSERT INTO crypto_invoices (store_id, invoice_id, amount, currency, status) 
       VALUES ($1, $2, $3, $4, $5)`,
      [store_id, data.id, amount, 'usd', 'waiting']
    );

    res.json({ success: true, invoice_url: data.invoice_url, invoice_id: data.id });
  } catch (err) {
    console.error('Error creating NOWPayments invoice:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/payments/nowpayments/webhook
router.post('/nowpayments/webhook', async (req, res) => {
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
  const sig = req.headers['x-nowpayments-sig'];

  if (ipnSecret && sig) {
    const hmac = crypto.createHmac('sha512', ipnSecret);
    const sortedData = Object.keys(req.body).sort().reduce((acc, key) => {
      acc[key] = req.body[key];
      return acc;
    }, {});
    hmac.update(JSON.stringify(sortedData));
    const calculatedSig = hmac.digest('hex');

    if (calculatedSig !== sig) {
      console.error('NOWPayments IPN signature mismatch!');
      return res.status(403).json({ error: 'Invalid signature' });
    }
  } else {
    console.warn('NOWPAYMENTS_IPN_SECRET not provided or signature missing. Proceeding without validation.');
  }

  const { payment_status, invoice_id, payment_id, price_amount, order_id } = req.body;
  const mappedStatus = payment_status; // e.g. 'finished', 'waiting', 'failed', 'refunded'

  try {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Update invoice
      const updateRes = await client.query(
        `UPDATE crypto_invoices 
         SET status = $1, payment_id = $2 
         WHERE invoice_id = $3 
         RETURNING store_id, status`,
        [mappedStatus, payment_id, invoice_id]
      );

      if (updateRes.rows.length === 0) {
        // Invoice not found
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const invoice = updateRes.rows[0];

      // If status is finished, add funds
      if (mappedStatus === 'finished') {
        const checkTx = await client.query(
          `SELECT id FROM wallet_transactions WHERE reason = $1`,
          [`Crypto Top-up (NOWPayments: ${payment_id})`]
        );

        if (checkTx.rows.length === 0) {
          // Add to wallet_transactions
          await client.query(
            `INSERT INTO wallet_transactions (store_id, amount, transaction_type, reason)
             VALUES ($1, $2, 'credit', $3)`,
            [invoice.store_id, price_amount, `Crypto Top-up (NOWPayments: ${payment_id})`]
          );

          // Update store balance
          await client.query(
            `UPDATE stores SET balance = balance + $1 WHERE id = $2`,
            [price_amount, invoice.store_id]
          );
        }
      }

      await client.query('COMMIT');
      res.status(200).send('OK');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error handling NOWPayments webhook:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/payments/status/:invoice_id
router.get('/status/:invoice_id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT status FROM crypto_invoices WHERE invoice_id = $1`,
      [req.params.invoice_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ success: true, status: result.rows[0].status });
  } catch (err) {
    console.error('Error fetching invoice status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
