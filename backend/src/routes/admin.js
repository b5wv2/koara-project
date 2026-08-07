const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../config/db');
const notificationService = require('../services/notificationService');
const fcmNotificationService = require('../services/fcmNotificationService');
const { provisionMerchant } = require('../services/merchantProvisioningService');
const broadcastService = require('../services/broadcastService');
const superAdminMiddleware = require('../middleware/superAdminMiddleware');



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

    // 1. Fetch the request to verify it exists and is pending
    const requestResult = await client.query('SELECT * FROM store_requests WHERE id = $1 AND status = $2', [store_id, 'pending']);
    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pending request not found' });
    }

    // 2. Provision the merchant using the single source of truth service
    await provisionMerchant(store_id, client);

    await client.query('COMMIT');

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
      SELECT s.id, s.store_name, s.subdomain, s.status, s.bank_name, s.account_name, s.account_no, s.balance, s.logo_url, s.store_currency, u.email
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
  console.log('[DEBUG] GET /api/admin/subscriptions entered');
  try {
    console.log('[DEBUG] Before db.query for subscriptions');
    const result = await db.query(`
      SELECT 
        s.id as store_id,
        s.store_name, 
        s.subdomain, 
        u.name AS owner_name, 
        u.id AS owner_id, 
        u.email AS owner_email,
        COALESCE(sub.plan, 'basic') as plan,
        COALESCE(sub.status, 'free') as status,
        sub.expires_at,
        sub.starts_at,
        sub.id as subscription_id
      FROM stores s
      JOIN users u ON u.id = s.owner_id
      LEFT JOIN subscriptions sub ON sub.store_id = s.id
      ORDER BY s.created_at DESC
    `);
    console.log(`[DEBUG] After db.query. Rows returned: ${result.rows.length}`);
    console.log('[DEBUG] Before sending response');
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

    // Dispatch FCM Notification for Wallet Deposit Approved
    try {
      const storeOwnerRes = await db.query('SELECT owner_id FROM stores WHERE id = $1', [storeId]);
      if (storeOwnerRes.rows.length > 0) {
        const merchantOwnerId = storeOwnerRes.rows[0].owner_id;
        fcmNotificationService.sendToMerchant(merchantOwnerId, {
          notification: {
            title: 'Wallet Updated',
            body: 'Funds have been added to your wallet.'
          },
          data: {
            type: 'wallet',
            route: '/wallet'
          }
        }).catch(err => console.error('[ADD-CREDIT] Async FCM Error:', err.message));
      }
    } catch (fcmErr) {
      console.error('[ADD-CREDIT] Non-blocking error dispatching FCM notification:', fcmErr);
    }

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

// --- Invitation Codes Management ---

// GET /api/admin/invitation-codes
router.get('/invitation-codes', async (req, res) => {
  try {
    const query = `
      SELECT c.*, u.email as creator_email 
      FROM invitation_codes c
      LEFT JOIN users u ON c.created_by = u.id
      ORDER BY c.created_at DESC
    `;
    const result = await db.query(query);
    res.json({ success: true, codes: result.rows });
  } catch (error) {
    console.error('Error fetching invitation codes:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/invitation-codes
router.post('/invitation-codes', async (req, res) => {
  const { code, type, max_uses, notes, expires_at } = req.body;
  const adminId = req.user.id;

  if (!code || max_uses === undefined) {
    return res.status(400).json({ error: 'Code and max_uses are required' });
  }

  try {
    const insertQuery = `
      INSERT INTO invitation_codes (code, type, max_uses, notes, expires_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await db.query(insertQuery, [
      code.trim(),
      type || 'kyc_bypass',
      max_uses,
      notes || null,
      expires_at || null,
      adminId
    ]);

    res.status(201).json({ success: true, code: result.rows[0] });
  } catch (error) {
    console.error('Error creating invitation code:', error.message);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Code already exists.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/invitation-codes/:id/status
router.put('/invitation-codes/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, disabled_reason } = req.body;

  if (!['active', 'disabled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const updateQuery = `
      UPDATE invitation_codes 
      SET status = $1, disabled_reason = $2 
      WHERE id = $3 
      RETURNING *
    `;
    const result = await db.query(updateQuery, [status, status === 'disabled' ? disabled_reason : null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation code not found' });
    }

    res.json({ success: true, code: result.rows[0] });
  } catch (error) {
    console.error('Error updating invitation code status:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/invitation-codes/:id/redemptions
router.get('/invitation-codes/:id/redemptions', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT r.*, u.name as user_name, s.store_name 
      FROM invitation_redemptions r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN stores s ON r.store_id = s.id
      WHERE r.code_id = $1
      ORDER BY r.redeemed_at DESC
    `;
    const result = await db.query(query, [id]);
    res.json({ success: true, redemptions: result.rows });
  } catch (error) {
    console.error('Error fetching redemptions:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Broadcast Center ---

// GET /api/admin/broadcasts
router.get('/broadcasts', superAdminMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT b.*, u.name as created_by_name
      FROM broadcasts b
      LEFT JOIN users u ON b.created_by = u.id
      ORDER BY b.created_at DESC
    `;
    const result = await db.query(query);
    res.json({ success: true, broadcasts: result.rows });
  } catch (error) {
    console.error('Error fetching broadcasts:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/broadcast
router.post('/broadcast', superAdminMiddleware, async (req, res) => {
  const { type, title, subject, message } = req.body;
  const adminId = req.user.id;

  if (!type || !['push', 'email', 'both'].includes(type)) {
    return res.status(400).json({ error: 'Valid broadcast type (push, email, both) is required' });
  }
  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required' });
  }
  if (message.length > 5000) {
    return res.status(400).json({ error: 'Message is too long' });
  }
  if ((type === 'push' || type === 'both') && (!title || title.trim().length === 0)) {
    return res.status(400).json({ error: 'Title is required for push notifications' });
  }
  if ((type === 'email' || type === 'both') && (!subject || subject.trim().length === 0)) {
    return res.status(400).json({ error: 'Subject is required for emails' });
  }

  try {
    const broadcastId = await broadcastService.sendBroadcast({
      type,
      title: title ? title.trim() : null,
      subject: subject ? subject.trim() : null,
      message: message.trim(),
      createdBy: adminId
    });
    res.json({ success: true, broadcastId, message: 'Broadcast scheduled successfully' });
  } catch (error) {
    console.error('Error scheduling broadcast:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Super Admin Subscription Management ---
router.post('/subscriptions/grant', async (req, res) => {
  const { storeId, plan, durationValue, durationUnit, action, reason } = req.body;
  if (!storeId || !action || !reason) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch current subscription to log 'old' state and verify store
      const subRes = await client.query('SELECT s.*, st.owner_id FROM subscriptions s JOIN stores st ON st.id = s.store_id WHERE s.store_id = $1', [storeId]);
      
      let oldPlan = 'basic';
      let oldExpiresAt = null;
      let ownerId = null;

      if (subRes.rows.length > 0) {
        oldPlan = subRes.rows[0].plan;
        oldExpiresAt = subRes.rows[0].expires_at;
        ownerId = subRes.rows[0].owner_id;
      } else {
        const storeRes = await client.query('SELECT owner_id FROM stores WHERE id = $1', [storeId]);
        if (storeRes.rows.length === 0) throw new Error('Store not found');
        ownerId = storeRes.rows[0].owner_id;
      }

      // 2. Calculate new expires_at
      let intervalStr = null;
      if (durationUnit === 'Lifetime') {
        intervalStr = null;
      } else if (action !== 'Cancel') {
        if (!durationValue || !durationUnit) {
          return res.status(400).json({ error: 'Invalid duration parameters' });
        }
        const val = parseInt(durationValue, 10);
        if (isNaN(val) || val <= 0) return res.status(400).json({ error: 'Duration value must be positive' });
        
        switch (durationUnit) {
          case 'Minutes': intervalStr = `${val} minutes`; break;
          case 'Hours': intervalStr = `${val} hours`; break;
          case 'Days': intervalStr = `${val} days`; break;
          case 'Weeks': intervalStr = `${val} weeks`; break;
          case 'Months': intervalStr = `${val} months`; break;
          case 'Years': intervalStr = `${val} years`; break;
          default: return res.status(400).json({ error: 'Invalid duration unit' });
        }
      }

      let newExpiresAtQuery = 'CURRENT_TIMESTAMP'; // default for Cancel
      let queryParams = [storeId];
      
      if (action === 'Cancel') {
        // Immediate expiration
        await client.query(`
          UPDATE subscriptions 
          SET plan = 'basic', status = 'cancelled', expires_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE store_id = $1
        `, [storeId]);
      } else {
        // Activate, Replace, Extend
        if (intervalStr === null) {
          // Lifetime
          newExpiresAtQuery = 'NULL';
        } else if (action === 'Extend' && oldExpiresAt && oldExpiresAt > new Date()) {
          newExpiresAtQuery = `expires_at + INTERVAL '${intervalStr}'`;
        } else {
          // Replace or Activate (start from now)
          newExpiresAtQuery = `CURRENT_TIMESTAMP + INTERVAL '${intervalStr}'`;
        }

        const upsertQuery = `
          INSERT INTO subscriptions (store_id, plan, status, starts_at, expires_at, payment_method, last_payment_amount)
          VALUES ($1, $2, 'active', CURRENT_TIMESTAMP, ${newExpiresAtQuery}, 'admin', 0)
          ON CONFLICT (store_id) 
          DO UPDATE SET 
            plan = EXCLUDED.plan, 
            status = 'active',
            starts_at = CASE WHEN subscriptions.status = 'active' THEN subscriptions.starts_at ELSE CURRENT_TIMESTAMP END,
            expires_at = ${newExpiresAtQuery},
            payment_method = 'admin',
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `;
        queryParams.push(plan); // $2
        await client.query(upsertQuery, queryParams);
      }

      // Fetch the updated subscription state
      const updatedSub = await client.query('SELECT plan, expires_at FROM subscriptions WHERE store_id = $1', [storeId]);
      const newPlan = updatedSub.rows.length > 0 ? updatedSub.rows[0].plan : 'basic';
      const newExpiresAt = updatedSub.rows.length > 0 ? updatedSub.rows[0].expires_at : null;

      // 3. Insert into audit logs
      await client.query(`
        INSERT INTO subscription_admin_logs (merchant_id, admin_id, action, old_plan, new_plan, old_expires_at, new_expires_at, reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [ownerId, req.user.id, action, oldPlan, newPlan, oldExpiresAt, newExpiresAt, reason]);

      await client.query('COMMIT');
      res.json({ message: 'Subscription successfully updated', newPlan, newExpiresAt });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error modifying subscription:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// Wallet Deposit System - Admin APIs
// ==========================================
const walletDepositService = require('../services/walletDepositService');

// --- Deposit Methods ---
router.get('/deposit-methods', async (req, res) => {
  try {
    const result = await db.pool.query('SELECT * FROM deposit_methods ORDER BY display_order ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching deposit methods:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/deposit-methods', async (req, res) => {
  try {
    const { name, type, account_holder, account_number, iban, bban, swift, currency_code, country, notes, logo_url, instructions, min_deposit, max_deposit, is_active, display_order } = req.body;
    const query = `
      INSERT INTO deposit_methods 
      (name, type, account_holder, account_number, iban, bban, swift, currency_code, country, notes, logo_url, instructions, min_deposit, max_deposit, is_active, display_order) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *
    `;
    const result = await db.pool.query(query, [name, type, account_holder, account_number, iban, bban, swift, currency_code, country, notes, logo_url, instructions, min_deposit || 0, max_deposit || 999999999, is_active ?? true, display_order || 0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating deposit method:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/deposit-methods/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, account_holder, account_number, iban, bban, swift, currency_code, country, notes, logo_url, instructions, min_deposit, max_deposit, is_active, display_order } = req.body;
    const query = `
      UPDATE deposit_methods 
      SET name = $1, type = $2, account_holder = $3, account_number = $4, iban = $5, bban = $6, swift = $7, currency_code = $8, country = $9, notes = $10, logo_url = $11, instructions = $12, min_deposit = $13, max_deposit = $14, is_active = $15, display_order = $16
      WHERE id = $17 RETURNING *
    `;
    const result = await db.pool.query(query, [name, type, account_holder, account_number, iban, bban, swift, currency_code, country, notes, logo_url, instructions, min_deposit, max_deposit, is_active, display_order, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating deposit method:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logo upload endpoint for deposit methods
const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/logos');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|svg|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only png, jpg, jpeg, svg, and webp are allowed"));
  }
});

router.post('/deposit-methods/logo', superAdminMiddleware, uploadLogo.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No logo file provided' });
  }
  
  // Return the relative URL to the uploaded logo
  const logoUrl = `/uploads/logos/${req.file.filename}`;
  res.json({ success: true, logo_url: logoUrl });
});

// --- Currencies ---
router.get('/currencies', async (req, res) => {
  try {
    const result = await db.pool.query('SELECT * FROM currencies ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching currencies:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/currencies', async (req, res) => {
  try {
    const { code, name, symbol, exchange_rate, is_base_currency, is_active } = req.body;
    const result = await db.pool.query(
      'INSERT INTO currencies (code, name, symbol, exchange_rate, is_base_currency, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [code, name, symbol, exchange_rate || 1.0, is_base_currency || false, is_active ?? true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating currency:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/currencies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, symbol, exchange_rate, is_base_currency, is_active } = req.body;
    const result = await db.pool.query(
      'UPDATE currencies SET code = $1, name = $2, symbol = $3, exchange_rate = $4, is_base_currency = $5, is_active = $6 WHERE id = $7 RETURNING *',
      [code, name, symbol, exchange_rate, is_base_currency, is_active, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating currency:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Wallet Deposit Requests ---
router.get('/wallet-deposits', async (req, res) => {
  try {
    const result = await db.pool.query(`
      SELECT r.*, s.store_name, s.subdomain, d.name as deposit_method_name 
      FROM wallet_deposit_requests r
      JOIN stores s ON r.store_id = s.id
      JOIN deposit_methods d ON r.deposit_method_id = d.id
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching wallet deposits:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/wallet-deposits/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await walletDepositService.approveRequest(id, req.user.id);
    res.json(response);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/wallet-deposits/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const response = await walletDepositService.rejectRequest(id, reason, req.user.id);
    res.json(response);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
