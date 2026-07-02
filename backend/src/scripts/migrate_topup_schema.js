const db = require('../config/db');

async function migrate() {
  const client = await db.pool.connect();
  try {
    console.log('Starting topup schema migration...');
    await client.query('BEGIN');

    console.log('Syncing merchant_topup_products schema...');
    await client.query(`
      ALTER TABLE merchant_topup_products 
      ADD COLUMN IF NOT EXISTS admin_cost_price NUMERIC(10,2);
    `);

    console.log('Syncing topup_orders schema...');
    await client.query(`
      ALTER TABLE topup_orders 
      ADD COLUMN IF NOT EXISTS admin_cost_price NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS last_sync_time TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS receipt_url TEXT;
      
      ALTER TABLE topup_orders ALTER COLUMN status SET DEFAULT 'pending';
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully. The schema is fully synced with the application code.');
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
