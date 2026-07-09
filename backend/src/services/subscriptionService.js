const db = require('../config/db');

const subscriptionService = {
  // Get a subscription, create a basic one if none exists, and auto-downgrade if expired
  async ensureSubscription(storeId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      let res = await client.query('SELECT * FROM subscriptions WHERE store_id = $1', [storeId]);
      
      if (res.rows.length === 0) {
        res = await client.query(`
          INSERT INTO subscriptions (store_id, plan, status)
          VALUES ($1, 'basic', 'active')
          RETURNING *
        `, [storeId]);
      } else {
        const sub = res.rows[0];
        // Check for expiration
        if (sub.plan === 'plus' && sub.status === 'active' && sub.expires_at) {
          if (new Date() > new Date(sub.expires_at)) {
            res = await client.query(`
              UPDATE subscriptions 
              SET plan = 'basic', status = 'expired', updated_at = CURRENT_TIMESTAMP
              WHERE id = $1
              RETURNING *
            `, [sub.id]);
            await this.logEventClient(client, storeId, 'expired', null, null, null);
          }
        }
      }
      
      await client.query('COMMIT');
      return res.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async logEvent(storeId, event, method, transactionId, amount) {
    await db.query(`
      INSERT INTO subscription_audit_logs (store_id, event, payment_method, transaction_id, amount)
      VALUES ($1, $2, $3, $4, $5)
    `, [storeId, event, method, transactionId, amount]);
  },

  async logEventClient(client, storeId, event, method, transactionId, amount) {
    await client.query(`
      INSERT INTO subscription_audit_logs (store_id, event, payment_method, transaction_id, amount)
      VALUES ($1, $2, $3, $4, $5)
    `, [storeId, event, method, transactionId, amount]);
  },

  async upgradeWithWallet(storeId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Lock store row for balance check
      const storeRes = await client.query('SELECT balance FROM stores WHERE id = $1 FOR UPDATE', [storeId]);
      if (storeRes.rows.length === 0) throw new Error('Store not found');
      
      const balance = parseFloat(storeRes.rows[0].balance);
      const cost = 4.99;
      
      if (balance < cost) {
        throw new Error('Insufficient wallet balance');
      }

      // Deduct balance
      await client.query('UPDATE stores SET balance = balance - $1 WHERE id = $2', [cost, storeId]);

      // Create wallet transaction
      const txRes = await client.query(`
        INSERT INTO wallet_transactions (store_id, amount, transaction_type, reason)
        VALUES ($1, $2, 'debit', 'Subscription Upgrade to Koara Plus')
        RETURNING id
      `, [storeId, cost]);
      
      // Update subscription
      const subRes = await client.query(`
        INSERT INTO subscriptions (store_id, plan, status, starts_at, expires_at, payment_method, last_payment_amount)
        VALUES ($1, 'plus', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', 'wallet', $2)
        ON CONFLICT (store_id) 
        DO UPDATE SET 
          plan = 'plus', 
          status = 'active', 
          starts_at = CURRENT_TIMESTAMP, 
          expires_at = CURRENT_TIMESTAMP + INTERVAL '30 days', 
          payment_method = 'wallet', 
          last_payment_amount = $2,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [storeId, cost]);

      // Audit log
      await this.logEventClient(client, storeId, 'activated', 'wallet', txRes.rows[0].id.toString(), cost);

      await client.query('COMMIT');
      return subRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
  
  async getBillingHistory(storeId) {
    const res = await db.query(`
      SELECT * FROM subscription_audit_logs 
      WHERE store_id = $1 
      ORDER BY timestamp DESC
    `, [storeId]);
    return res.rows;
  }
};

module.exports = subscriptionService;
