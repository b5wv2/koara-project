require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://koara:koara123@localhost:5432/koara_db' });

async function test() {
  try {
    const storeSubRes = await pool.query(`
      SELECT s.*, sub.id as sub_id, sub.plan, sub.status as sub_status, sub.starts_at, sub.expires_at 
      FROM stores s 
      LEFT JOIN subscriptions sub ON sub.store_id = s.id 
      WHERE s.id = 2 AND sub.status = 'active'
    `);
    const store = storeSubRes.rows[0];
    console.log('Store 2 starts_at:', store.starts_at);

    const ordersRes = await pool.query("SELECT COUNT(*) as total_orders FROM orders WHERE store_id = 2 AND created_at >= $1", [store.starts_at]);
    console.log('Orders with starts_at:', ordersRes.rows);

    const ordersAll = await pool.query("SELECT COUNT(*) as total_orders FROM orders WHERE store_id = 2");
    console.log('Orders ALL:', ordersAll.rows);

    const recentOrdersRes = await pool.query(`
      SELECT o.id, o.created_at, p.name as product_name, o.amount, o.status, 1 as quantity
      FROM orders o
      JOIN products p ON p.id = o.product_id
      WHERE o.store_id = 2
      ORDER BY o.created_at DESC
      LIMIT 10
    `);
    console.log('Recent Orders (JOIN):', recentOrdersRes.rows.length);

    const recentOrdersNoJoin = await pool.query(`
      SELECT o.id, o.created_at, o.product_name, o.amount, o.status, o.quantity
      FROM orders o
      WHERE o.store_id = 2
      ORDER BY o.created_at DESC
      LIMIT 10
    `);
    console.log('Recent Orders (No JOIN):', recentOrdersNoJoin.rows.length);

  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
test();
