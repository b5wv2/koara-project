const db = require('../config/db');

class WalletCreditService {
  /**
   * Performs an atomic wallet transaction for a local bank transfer.
   * 1. Lock/insert verification record.
   * 2. Credit wallet.
   * 3. Create wallet ledger entry.
   * 4. Mark top-up request completed (implicitly done via insertion).
   * 5. Commit.
   */
  async processVerifiedLocalTransfer(merchantId, transactionId, amount) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock/insert verification record.
      // Rejects duplicate transaction IDs due to UNIQUE constraint on transaction_id.
      await client.query(
        `INSERT INTO verified_local_transactions (transaction_id, merchant_id, amount) 
         VALUES ($1, $2, $3)`,
        [transactionId, merchantId, amount]
      );

      // 2. Credit wallet
      await client.query(
        `UPDATE stores SET balance = balance + $1 WHERE id = $2`,
        [amount, merchantId]
      );

      // 3. Create wallet ledger entry
      await client.query(
        `INSERT INTO wallet_transactions (store_id, amount, transaction_type, reason)
         VALUES ($1, $2, 'credit', $3)`,
        [merchantId, amount, `Local Bank Transfer Top-up (Tx: ${transactionId})`]
      );

      // 5. Commit
      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      // PostgreSQL unique_violation error code
      if (error.code === '23505') {
        throw new Error('Duplicate transaction ID. This transaction has already been processed.');
      }
      console.error('Error during atomic wallet credit transaction:', error);
      throw new Error('Internal error processing wallet credit.');
    } finally {
      client.release();
    }
  }
}

module.exports = new WalletCreditService();
