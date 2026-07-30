require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://koara:koara123@localhost:5432/koara_db' 
});

async function verify() {
  try {
    // Find the store with balance ~3000
    const storeRes = await pool.query("SELECT * FROM stores WHERE balance > 1000 LIMIT 1");
    if (storeRes.rows.length === 0) {
      console.log("No store found with high balance. Fetching first active store...");
      const fallback = await pool.query("SELECT * FROM stores WHERE status = 'active' LIMIT 1");
      if (fallback.rows.length === 0) {
        console.log("No active stores found.");
        return;
      }
      storeRes.rows = fallback.rows;
    }
    
    const store = storeRes.rows[0];
    const storeId = store.id;
    console.log(`\n=================================================`);
    console.log(`Analyzing Store ID: ${storeId} (${store.store_name})`);
    console.log(`Store Balance column 'balance':`, store.balance);
    console.log(`Store Balance property 'wallet_balance':`, store.wallet_balance);
    console.log(`=================================================\n`);

    const subRes = await pool.query("SELECT * FROM subscriptions WHERE store_id = $1 AND status = 'active'", [storeId]);
    const sub = subRes.rows[0];
    console.log(`Active Subscription Starts At:`, sub ? sub.starts_at : 'No active sub');
    
    if (!sub) {
      console.log("\nCannot proceed with date filter tests without an active subscription.");
      return;
    }

    // 1. Wallet query result
    console.log(`\n--- 1. Wallet Balance Source ---`);
    console.log(`Query: SELECT balance FROM stores WHERE id = ${storeId}`);
    console.log(`Result:`, [{ balance: store.balance }]);
    console.log(`Issue: The PDF was referencing 'store.wallet_balance' which is undefined, instead of 'store.balance'.`);

    // 2. Rejected orders query result
    console.log(`\n--- 2. Rejected Orders Source (orders table) ---`);
    const rejectedOrdersRes = await pool.query(`
      SELECT id, status, created_at 
      FROM orders 
      WHERE store_id = $1 AND status ILIKE '%reject%'
    `, [storeId]);
    console.log(`Query: SELECT id, status, created_at FROM orders WHERE store_id = ${storeId} AND status ILIKE '%reject%'`);
    console.log(`Result rows:`, rejectedOrdersRes.rows);
    
    console.log(`\n--- 2b. Rejected Orders Source (topup_orders table) ---`);
    const rejectedTopupRes = await pool.query(`
      SELECT id, status, created_at 
      FROM topup_orders 
      WHERE store_id = $1 AND status ILIKE '%reject%'
    `, [storeId]);
    console.log(`Query: SELECT id, status, created_at FROM topup_orders WHERE store_id = ${storeId} AND status ILIKE '%reject%'`);
    console.log(`Result rows:`, rejectedTopupRes.rows);

    // 3. Completed orders query result
    console.log(`\n--- 3. Completed Orders Source (orders) ---`);
    const completedRes = await pool.query(`SELECT id, status, amount, created_at FROM orders WHERE store_id = $1 AND status = 'completed'`, [storeId]);
    console.log(`Result rows (count):`, completedRes.rows.length);
    if (completedRes.rows.length > 0) console.log(`Sample:`, completedRes.rows[0]);
    
    console.log(`\n--- 3b. Completed Orders Source (topup_orders) ---`);
    const completedTopupRes = await pool.query(`SELECT id, status, selling_price as amount, created_at FROM topup_orders WHERE store_id = $1 AND status = 'completed'`, [storeId]);
    console.log(`Result rows (count):`, completedTopupRes.rows.length);
    if (completedTopupRes.rows.length > 0) console.log(`Sample:`, completedTopupRes.rows[0]);

    // 4. Latest orders query result
    console.log(`\n--- 4. Latest Orders (orders) ---`);
    const latestRes = await pool.query(`SELECT id, status, created_at FROM orders WHERE store_id = $1 ORDER BY created_at DESC LIMIT 3`, [storeId]);
    console.log(`Result rows:`, latestRes.rows);
    
    console.log(`\n--- 4b. Latest Orders (topup_orders) ---`);
    const latestTopupRes = await pool.query(`SELECT id, status, created_at FROM topup_orders WHERE store_id = $1 ORDER BY created_at DESC LIMIT 3`, [storeId]);
    console.log(`Result rows:`, latestTopupRes.rows);

    // 5. Product summary query result
    console.log(`\n--- 5. Product Summary Source (orders table) ---`);
    const productSumRes = await pool.query(`
      SELECT product_id, product_name, amount 
      FROM orders 
      WHERE store_id = $1 AND status = 'completed'
      LIMIT 3
    `, [storeId]);
    console.log(`Query: SELECT product_id, product_name, amount FROM orders WHERE store_id = ${storeId} AND status = 'completed'`);
    console.log(`Result rows:`, productSumRes.rows);
    console.log(`Issue: If product_id is null, a JOIN with products table will return 0 rows.`);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

verify();
