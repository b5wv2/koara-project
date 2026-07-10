const express = require('express');
const router = express.Router();
const db = require('../config/db');
const notificationService = require('../services/notificationService');

// GET /api/admin/kyc/pending
router.get('/kyc/pending', async (req, res) => {
  try {
    const query = `
      SELECT id, store_name as "storeName", applicant_name as applicant, email, status, created_at, bank_name, account_holder_name, account_number, kyc_document_url
      FROM store_requests
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `;
    const result = await db.query(query);
    res.json({ pending: result.rows });
  } catch (error) {
    console.error('Error fetching pending KYC requests:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/kyc/approve
router.post('/kyc/approve', async (req, res) => {
  const { store_id } = req.body;
  if (!store_id) {
    return res.status(400).json({ error: 'store_id is required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch the request
    const requestResult = await client.query('SELECT * FROM store_requests WHERE id = $1 AND status = $2', [store_id, 'pending']);
    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pending request not found' });
    }
    const request = requestResult.rows[0];

    // 2. Create the user
    const insertUserQuery = `
      INSERT INTO users (name, email, password_hash, role, status)
      VALUES ($1, $2, $3, 'merchant', 'active')
      RETURNING id;
    `;
    const userResult = await client.query(insertUserQuery, [request.applicant_name, request.email, request.password_hash]);
    const newUser = userResult.rows[0];

    const insertStoreQuery = `
      INSERT INTO stores (owner_id, store_name, subdomain, status, bank_name, account_name, account_no)
      VALUES ($1, $2, $3, 'active', $4, $5, $6)
    `;
    await client.query(insertStoreQuery, [
      newUser.id,
      request.store_name,
      request.subdomain,
      request.bank_name,
      request.account_holder_name,
      request.account_number
    ]);

    // 4. Update request status
    await client.query('UPDATE store_requests SET status = $1 WHERE id = $2', ['approved', store_id]);

    await client.query('COMMIT');
    
    // Trigger notification (doesn't throw on error)
    await notificationService.sendStoreApproved(request.email, request.store_name, request.subdomain);

    res.json({ success: true, message: 'Merchant approved and created successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving KYC request:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST /api/admin/kyc/reject
router.post('/kyc/reject', async (req, res) => {
  const { store_id, reason } = req.body;
  if (!store_id) {
    return res.status(400).json({ error: 'store_id is required' });
  }

  try {
    const updateQuery = `
      UPDATE store_requests 
      SET status = 'rejected', rejection_reason = $1, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND status = 'pending'
      RETURNING *
    `;
    const result = await db.query(updateQuery, [reason || null, store_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pending request not found' });
    }

    const request = result.rows[0];
    // Trigger notification (doesn't throw on error)
    await notificationService.sendStoreRejected(request.email, request.store_name, reason);

    res.json({ success: true, message: 'Merchant request rejected.' });
  } catch (error) {
    console.error('Error rejecting KYC request:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/stores
router.get('/stores', async (req, res) => {
  try {
    const query = `
      SELECT s.id, s.store_name, s.subdomain, s.status, s.bank_name, s.account_name, s.account_no, s.balance, u.email
      FROM stores s
      JOIN users u ON s.owner_id = u.id
      ORDER BY s.created_at DESC
    `;
    const result = await db.query(query);
    res.json({ stores: result.rows });
  } catch (error) {
    console.error('Error fetching stores:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Subscriptions ---

router.get('/subscriptions', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT sub.*, s.store_name, s.subdomain 
      FROM subscriptions sub
      JOIN stores s ON s.id = sub.store_id
      ORDER BY sub.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching admin subscriptions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/stores/:id/subscription/action', async (req, res) => {
  const { id } = req.params;
  const { action, days } = req.body; // action: 'activate', 'cancel', 'extend'
  try {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const storeId = id;
      
      let resSub;
      if (action === 'activate') {
        resSub = await client.query(`
          INSERT INTO subscriptions (store_id, plan, status, starts_at, expires_at, payment_method, last_payment_amount)
          VALUES ($1, 'plus', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', 'admin', 0)
          ON CONFLICT (store_id) 
          DO UPDATE SET plan = 'plus', status = 'active', starts_at = CURRENT_TIMESTAMP, expires_at = CURRENT_TIMESTAMP + INTERVAL '30 days', payment_method = 'admin', updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `, [storeId]);
      } else if (action === 'cancel') {
        resSub = await client.query(`
          UPDATE subscriptions SET plan = 'basic', status = 'cancelled', expires_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE store_id = $1 RETURNING *
        `, [storeId]);
      } else if (action === 'extend' && days) {
        resSub = await client.query(`
          UPDATE subscriptions SET expires_at = expires_at + ($2 || ' days')::interval, updated_at = CURRENT_TIMESTAMP
          WHERE store_id = $1 RETURNING *
        `, [storeId, days]);
      } else {
        throw new Error('Invalid action or parameters');
      }

      await client.query(`
        INSERT INTO subscription_audit_logs (store_id, event, payment_method, amount)
        VALUES ($1, $2, 'admin', 0)
      `, [storeId, `admin_${action}`]);

      await client.query('COMMIT');
      res.json({ success: true, subscription: resSub.rows[0] });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error in admin subscription action:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/admin/stores/:id/add-credit
router.post('/stores/:id/add-credit', async (req, res) => {
  const storeId = req.params.id;
  const { amount, reason } = req.body;

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number greater than zero.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const updateQuery = `
      UPDATE stores 
      SET balance = balance + $1 
      WHERE id = $2 
      RETURNING balance
    `;
    const storeResult = await client.query(updateQuery, [amount, storeId]);

    if (storeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Store not found' });
    }

    const newBalance = storeResult.rows[0].balance;

    const insertTxQuery = `
      INSERT INTO wallet_transactions (store_id, amount, transaction_type, reason)
      VALUES ($1, $2, 'credit', $3)
    `;
    await client.query(insertTxQuery, [storeId, amount, reason || 'Admin Manual Credit']);

    await client.query('COMMIT');
    res.json({ success: true, balance: newBalance });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding credit:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST /api/admin/stores/:id/deduct
router.post('/stores/:id/deduct', async (req, res) => {
  const storeId = req.params.id;
  const { amount, reason } = req.body;

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number greater than zero.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Check current balance
    const storeCheck = await client.query('SELECT balance FROM stores WHERE id = $1', [storeId]);
    if (storeCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Store not found' });
    }

    const currentBalance = parseFloat(storeCheck.rows[0].balance);
    if (currentBalance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient funds. Cannot deduct more than the current balance.' });
    }

    const updateQuery = `
      UPDATE stores 
      SET balance = balance - $1 
      WHERE id = $2 
      RETURNING balance
    `;
    const storeResult = await client.query(updateQuery, [amount, storeId]);
    const newBalance = storeResult.rows[0].balance;

    const insertTxQuery = `
      INSERT INTO wallet_transactions (store_id, amount, transaction_type, reason)
      VALUES ($1, $2, 'debit', $3)
    `;
    await client.query(insertTxQuery, [storeId, amount, reason || 'Admin Manual Debit']);

    await client.query('COMMIT');
    res.json({ success: true, balance: newBalance });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deducting credit:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/admin/stores/:id/transactions
router.get('/stores/:id/transactions', async (req, res) => {
  const storeId = req.params.id;
  try {
    const query = `
      SELECT id, amount, transaction_type, reason, created_at
      FROM wallet_transactions
      WHERE store_id = $1
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [storeId]);
    res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Error fetching transactions:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/transactions (Global Ledger)
router.get('/transactions', async (req, res) => {
  try {
    const query = `
      SELECT t.id, t.amount, t.transaction_type, t.reason, t.created_at, s.store_name
      FROM wallet_transactions t
      JOIN stores s ON t.store_id = s.id
      ORDER BY t.created_at DESC
    `;
    const result = await db.query(query);
    res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Error fetching global transactions:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/stores/:id/status
router.post('/stores/:id/status', async (req, res) => {
  const storeId = req.params.id;
  const { status } = req.body;

  if (!status || !['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Valid status (active or suspended) is required.' });
  }

  try {
    const updateQuery = `
      UPDATE stores 
      SET status = $1 
      WHERE id = $2 
      RETURNING *
    `;
    const result = await db.query(updateQuery, [status, storeId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    res.json({ success: true, store: result.rows[0] });
  } catch (error) {
    console.error('Error updating store status:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/stores/:id
router.delete('/stores/:id', async (req, res) => {
  const storeId = req.params.id;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Find the store and its owner
    const storeQuery = await client.query('SELECT owner_id FROM stores WHERE id = $1', [storeId]);
    if (storeQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Store not found' });
    }

    const ownerId = storeQuery.rows[0].owner_id;

    // Get the owner's email to delete store_requests footprint
    const userQuery = await client.query('SELECT email FROM users WHERE id = $1', [ownerId]);
    const userEmail = userQuery.rows[0]?.email;

    // Delete user. This cascades to stores and wallet_transactions due to ON DELETE CASCADE
    await client.query('DELETE FROM users WHERE id = $1', [ownerId]);

    if (userEmail) {
      // Wipe their store requests so they can register again cleanly
      await client.query('DELETE FROM store_requests WHERE email = $1', [userEmail]);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Store and all related records deleted permanently.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting store permanently:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// --- Withdrawals Management ---

// GET /api/admin/withdrawals
router.get('/withdrawals', async (req, res) => {
  try {
    const query = `
      SELECT w.*, s.store_name, s.subdomain, u.email as merchant_email
      FROM withdrawal_requests w
      JOIN stores s ON w.store_id = s.id
      JOIN users u ON w.merchant_id = u.id
      ORDER BY 
        CASE WHEN w.status = 'pending' THEN 1 ELSE 2 END,
        w.created_at DESC
    `;
    const result = await db.query(query);
    res.json({ success: true, requests: result.rows });
  } catch (error) {
    console.error('Error fetching withdrawals:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/withdrawals/:id/approve
router.post('/withdrawals/:id/approve', async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id;

  try {
    const result = await db.query(
      `UPDATE withdrawal_requests 
       SET status = 'approved', processed_at = CURRENT_TIMESTAMP, processed_by = $1
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [adminId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Withdrawal request not found or already processed' });
    }

    res.json({ success: true, request: result.rows[0] });
  } catch (error) {
    console.error('Error approving withdrawal:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/withdrawals/:id/reject
router.post('/withdrawals/:id/reject', async (req, res) => {
  const { id } = req.params;
  const adminId = req.user.id;
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get the pending request
    const withdrawRes = await client.query(
      `SELECT store_id, amount FROM withdrawal_requests WHERE id = $1 AND status = 'pending' FOR UPDATE`,
      [id]
    );

    if (withdrawRes.rows.length === 0) {
      throw new Error('Withdrawal request not found or already processed');
    }

    const { store_id, amount } = withdrawRes.rows[0];

    // 2. Update status to rejected
    const updateRes = await client.query(
      `UPDATE withdrawal_requests 
       SET status = 'rejected', processed_at = CURRENT_TIMESTAMP, processed_by = $1
       WHERE id = $2
       RETURNING *`,
      [adminId, id]
    );

    // 3. Refund amount to store
    await client.query(
      `UPDATE stores SET balance = balance + $1 WHERE id = $2`,
      [amount, store_id]
    );

    // 4. Log wallet transaction
    await client.query(
      `INSERT INTO wallet_transactions (store_id, amount, transaction_type, reason)
       VALUES ($1, $2, 'credit', 'Withdrawal Request Rejected - Refund')`,
      [store_id, amount]
    );

    await client.query('COMMIT');
    res.json({ success: true, request: updateRes.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error rejecting withdrawal:', error.message);
    res.status(400).json({ error: error.message || 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
