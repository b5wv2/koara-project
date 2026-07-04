const express = require('express');
const router = express.Router();
const localPaymentService = require('../services/localPaymentService');

// GET /api/payments/local/config
router.get('/config', (req, res) => {
  res.json({
    account_number: process.env.LOCAL_BANK_ACCOUNT_NUMBER || '',
    account_name: process.env.LOCAL_BANK_ACCOUNT_NAME || ''
  });
});

// POST /api/payments/local/verify
router.post('/verify', async (req, res) => {
  // Use store_id as merchant_id to align with existing architecture
  const { store_id, transaction_id, amount } = req.body;

  if (!store_id || !transaction_id || !amount) {
    return res.status(400).json({ error: 'store_id, transaction_id, and amount are required' });
  }

  try {
    await localPaymentService.verifyAndCredit(store_id, transaction_id, amount);
    res.json({ success: true, message: 'Payment verified successfully.' });
  } catch (err) {
    if (err.message.includes('Verification failed') || err.message.includes('Duplicate')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error while verifying payment.' });
  }
});

module.exports = router;
