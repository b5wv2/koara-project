const db = require('../config/db');

async function migrate() {
  const client = await db.pool.connect();
  try {
    console.log('Starting topup schema migration...');
    await client.query('BEGIN');

    console.log('Adding admin_cost_price to merchant_topup_products...');
    await client.query(`
      ALTER TABLE merchant_topup_products 
      ADD COLUMN IF NOT EXISTS admin_cost_price NUMERIC(10,2);
    `);

    console.log('Adding admin_cost_price and last_sync_time to topup_orders...');
    await client.query(`
      ALTER TABLE topup_orders 
      ADD COLUMN IF NOT EXISTS admin_cost_price NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS last_sync_time TIMESTAMP WITH TIME ZONE;
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
