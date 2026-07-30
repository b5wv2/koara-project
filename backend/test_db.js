require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://koara:koara123@localhost:5432/koara_db' });

async function test() {
  try {
    const res = await pool.query("SELECT COUNT(*) as total_orders, COUNT(*) FILTER (WHERE status = 'completed') as completed, COALESCE(SUM(amount), 0) as gross FROM orders WHERE store_id = 4 AND created_at >= '2026-07-13'");
    console.log('QUERY 1:', res.rows);
    
    // Check if storeId 2 has any orders
    const res2 = await pool.query("SELECT COUNT(*) as total_orders, COUNT(*) FILTER (WHERE status = 'completed') as completed, COALESCE(SUM(amount), 0) as gross FROM orders WHERE store_id = 2");
    console.log('QUERY 2 (store_id=2):', res2.rows);

    const sub = await pool.query("SELECT * FROM subscriptions WHERE store_id = 2");
    console.log('SUB 2:', sub.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
test();
