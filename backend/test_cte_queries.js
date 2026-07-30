require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://koara:koara123@localhost:5432/koara_db' 
});

async function verify() {
  try {
    const storeId = 2;
    const storeRes = await pool.query("SELECT * FROM stores WHERE id = $1", [storeId]);
    const store = storeRes.rows[0];
    
    const subRes = await pool.query("SELECT * FROM subscriptions WHERE store_id = $1 AND status = 'active'", [storeId]);
    const sub = subRes.rows[0];

    const unifiedOrdersCTE = `
      WITH unified_orders AS (
        SELECT 
          id, created_at, status, amount, product_name, 1 as quantity
        FROM orders
        WHERE store_id = $1 AND created_at >= $2
        
        UNION ALL
        
        SELECT 
          id, created_at, status, selling_price as amount, offer_id as product_name, 1 as quantity
        FROM topup_orders
        WHERE store_id = $1 AND created_at >= $2
      )
    `;

    const ordersRes = await pool.query(`
      ${unifiedOrdersCTE}
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_orders,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_orders,
        COUNT(*) FILTER (WHERE status = 'refunded') as refunded_orders,
        COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as gross_sales,
        COALESCE(SUM(amount) FILTER (WHERE status = 'refunded'), 0) as refunded_amount,
        MIN(created_at) as first_order_date,
        MAX(created_at) as latest_order_date
      FROM unified_orders
    `, [storeId, sub.starts_at]);
    
    console.log("Unified Orders Stats:", ordersRes.rows[0]);
    
    const productsRes = await pool.query(`
      ${unifiedOrdersCTE}
      SELECT product_name, COUNT(*) as quantity_sold, COALESCE(SUM(amount), 0) as revenue
      FROM unified_orders
      WHERE status = 'completed'
      GROUP BY product_name
      ORDER BY quantity_sold DESC
    `, [storeId, sub.starts_at]);
    
    console.log("Unified Product Summary:", productsRes.rows);

    const recentOrdersRes = await pool.query(`
      ${unifiedOrdersCTE}
      SELECT id, created_at, product_name, amount, status, quantity
      FROM unified_orders
      ORDER BY created_at DESC
      LIMIT 10
    `, [storeId, sub.starts_at]);
    
    console.log("Unified Recent Orders:", recentOrdersRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

verify();
