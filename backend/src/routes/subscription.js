const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const subscriptionService = require('../services/subscriptionService');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/subscription/webhook/crypto
// NO AUTH MIDDLEWARE HERE - IT'S A WEBHOOK
router.post('/webhook/crypto', async (req, res) => {
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
  }

  const { payment_status, invoice_id, payment_id, price_amount, order_id } = req.body;
  const mappedStatus = payment_status; // e.g. 'finished', 'waiting'

  try {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const updateRes = await client.query(
        `UPDATE crypto_invoices 
         SET status = $1, payment_id = $2 
         WHERE invoice_id = $3 
         RETURNING store_id, status`,
        [mappedStatus, payment_id, invoice_id]
      );

      if (updateRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const invoice = updateRes.rows[0];

      if (mappedStatus === 'finished') {
        const checkLog = await client.query(
          `SELECT id FROM subscription_audit_logs WHERE transaction_id = $1`,
          [payment_id.toString()]
        );

        if (checkLog.rows.length === 0) {
          // Activate Subscription
          await client.query(`
            INSERT INTO subscriptions (store_id, plan, status, starts_at, expires_at, payment_method, last_payment_amount)
            VALUES ($1, 'plus', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', 'crypto', $2)
            ON CONFLICT (store_id) 
            DO UPDATE SET 
              plan = 'plus', 
              status = 'active', 
              starts_at = CURRENT_TIMESTAMP, 
              expires_at = CURRENT_TIMESTAMP + INTERVAL '30 days', 
              payment_method = 'crypto', 
              last_payment_amount = $2,
              updated_at = CURRENT_TIMESTAMP
          `, [invoice.store_id, price_amount]);

          await subscriptionService.logEventClient(client, invoice.store_id, 'activated', 'crypto', payment_id.toString(), price_amount);
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
    console.error('Error handling subscription crypto webhook:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// All routes below require merchant auth
router.use(authMiddleware);

// Ensure user is a merchant and resolve store_id
router.use(async (req, res, next) => {
  if (req.user && req.user.role === 'merchant') {
    try {
      const storeRes = await db.query('SELECT id FROM stores WHERE owner_id = $1', [req.user.id]);
      if (storeRes.rows.length === 0) {
        return res.status(403).json({ error: 'Store not found' });
      }
      req.merchantStoreId = storeRes.rows[0].id;
      next();
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(403).json({ error: 'Merchant access required' });
  }
});

// GET /api/subscription
router.get('/', async (req, res) => {
  try {
    const sub = await subscriptionService.ensureSubscription(req.merchantStoreId);
    res.json(sub);
  } catch (err) {
    console.error('Error fetching subscription:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/subscription/history
router.get('/history', async (req, res) => {
  try {
    const history = await subscriptionService.getBillingHistory(req.merchantStoreId);
    res.json(history);
  } catch (err) {
    console.error('Error fetching billing history:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscription/upgrade/wallet
router.post('/upgrade/wallet', async (req, res) => {
  try {
    const sub = await subscriptionService.upgradeWithWallet(req.merchantStoreId);
    res.json({ success: true, message: 'Koara Plus activated successfully.', subscription: sub });
  } catch (err) {
    console.error('Wallet upgrade error:', err);
    if (err.message === 'Insufficient wallet balance') {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error: ' + err.message });
  }
});

// POST /api/subscription/upgrade/crypto-invoice
router.post('/upgrade/crypto-invoice', async (req, res) => {
  try {
    const store_id = req.merchantStoreId;
    const amount = 4.99; // Fixed price for Koara Plus
    const orderId = `SUB-${store_id}-${Date.now()}`;
    const pay_currency = req.body.pay_currency;

    if (!pay_currency) {
      return res.status(400).json({ error: 'pay_currency is required' });
    }
    
    const invoiceData = {
      price_amount: amount,
      price_currency: 'usd',
      order_id: orderId,
      order_description: 'Koara Plus Subscription',
      success_url: 'https://www.getkoara.com/merchant/dashboard',
      cancel_url: 'https://www.getkoara.com/merchant/dashboard'
    };

    // 1. Create Invoice
    const invoiceResponse = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoiceData)
    });

    const invoiceJson = await invoiceResponse.json();

    if (!invoiceResponse.ok) {
      console.error('NOWPayments invoice error:', invoiceJson);
      return res.status(500).json({ error: 'Failed to create crypto invoice' });
    }

    // 2. Create Payment for Invoice to get address natively
    const paymentResponse = await fetch('https://api.nowpayments.io/v1/invoice-payment', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        iid: invoiceJson.id,
        pay_currency: pay_currency
      })
    });

    const paymentJson = await paymentResponse.json();

    if (!paymentResponse.ok) {
      console.error('NOWPayments payment error:', paymentJson);
      return res.status(500).json({ error: 'Failed to generate payment address' });
    }

    // Insert into crypto_invoices
    await db.query(
      `INSERT INTO crypto_invoices (store_id, invoice_id, amount, currency, status) 
       VALUES ($1, $2, $3, $4, $5)`,
      [store_id, invoiceJson.id, amount, 'usd', 'waiting']
    );

    res.json({ 
      success: true, 
      invoice_id: invoiceJson.id,
      invoice_url: invoiceJson.invoice_url,
      payment_id: paymentJson.payment_id,
      pay_address: paymentJson.pay_address,
      pay_amount: paymentJson.pay_amount,
      pay_currency: paymentJson.pay_currency
    });
  } catch (err) {
    console.error('Error creating NOWPayments invoice for subscription:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
