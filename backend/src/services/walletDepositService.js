const db = require('../config/db');
const fcmNotificationService = require('./fcmNotificationService');
const notificationService = require('./notificationService'); // For email fallback if needed

class WalletDepositService {
  /**
   * Approves a wallet deposit request.
   * 1. Check if request is still pending.
   * 2. Update status to 'approved'.
   * 3. Credit wallet balance on `stores`.
   * 4. Insert `wallet_transactions` log.
   * 5. Send FCM notification to merchant.
   */
  async approveRequest(requestId, adminId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch request with row-level lock
      const requestRes = await client.query(
        `SELECT r.*, s.owner_id 
         FROM wallet_deposit_requests r
         JOIN stores s ON r.store_id = s.id
         WHERE r.id = $1 FOR UPDATE`,
        [requestId]
      );

      if (requestRes.rowCount === 0) {
        throw new Error('Deposit request not found.');
      }

      const request = requestRes.rows[0];

      if (request.status !== 'pending') {
        throw new Error(`Cannot approve request. Current status is ${request.status}.`);
      }

      // 2. Update status
      await client.query(
        `UPDATE wallet_deposit_requests 
         SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $1 
         WHERE id = $2`,
        [adminId || null, requestId]
      );

      // 3. Credit wallet
      await client.query(
        `UPDATE stores SET balance = balance + $1 WHERE id = $2`,
        [request.credited_amount, request.store_id]
      );

      // 4. Create ledger entry
      await client.query(
        `INSERT INTO wallet_transactions (store_id, amount, transaction_type, reason)
         VALUES ($1, $2, 'credit', $3)`,
        [
          request.store_id, 
          request.credited_amount, 
          `Wallet Deposit Approved (Req #${requestId}) - ${request.credited_amount} ${request.credited_currency}`
        ]
      );

      await client.query('COMMIT');

      // 5. Send Notification (Non-blocking)
      try {
        await fcmNotificationService.sendToMerchant(request.owner_id, {
          notification: {
            title: 'Deposit Approved',
            body: `Your deposit of ${request.credited_amount} ${request.credited_currency} has been credited to your wallet.`
          },
          data: {
            type: 'WALLET_DEPOSIT_APPROVED',
            requestId: requestId.toString()
          }
        });
      } catch (fcmErr) {
        console.error(`[WalletDepositService] Non-blocking FCM error: ${fcmErr.message}`);
      }

      return { success: true, message: 'Deposit approved successfully.' };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[WalletDepositService] Error approving request:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rejects a wallet deposit request.
   */
  async rejectRequest(requestId, reason, adminId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const requestRes = await client.query(
        `SELECT r.*, s.owner_id 
         FROM wallet_deposit_requests r
         JOIN stores s ON r.store_id = s.id
         WHERE r.id = $1 FOR UPDATE`,
        [requestId]
      );

      if (requestRes.rowCount === 0) {
        throw new Error('Deposit request not found.');
      }

      const request = requestRes.rows[0];

      if (request.status !== 'pending') {
        throw new Error(`Cannot reject request. Current status is ${request.status}.`);
      }

      // Update status
      await client.query(
        `UPDATE wallet_deposit_requests 
         SET status = 'rejected', rejection_reason = $1, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2 
         WHERE id = $3`,
        [reason, adminId || null, requestId]
      );

      await client.query('COMMIT');

      // Send Notification (Non-blocking)
      try {
        await fcmNotificationService.sendToMerchant(request.owner_id, {
          notification: {
            title: 'Deposit Rejected',
            body: `Your deposit request of ${request.requested_amount} ${request.requested_currency} was rejected.`
          },
          data: {
            type: 'WALLET_DEPOSIT_REJECTED',
            requestId: requestId.toString(),
            reason: reason || ''
          }
        });
      } catch (fcmErr) {
        console.error(`[WalletDepositService] Non-blocking FCM error: ${fcmErr.message}`);
      }

      return { success: true, message: 'Deposit rejected successfully.' };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[WalletDepositService] Error rejecting request:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new WalletDepositService();
