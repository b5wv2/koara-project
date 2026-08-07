const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'koara_db',
    };

const pool = new Pool(poolConfig);

async function runPatch() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Applying Store Currency schema patches...');

    // 1. Add store_currency to stores
    await client.query(`ALTER TABLE stores ADD COLUMN IF NOT EXISTS store_currency VARCHAR(10) DEFAULT 'USD'`);
    console.log('- Added store_currency to stores');

    // 2. Add provider_cost and store_currency to orders
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_cost NUMERIC(10,2)`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_currency VARCHAR(10) DEFAULT 'USD'`);
    console.log('- Added provider_cost and store_currency to orders');

    // 3. Add store_currency to topup_orders
    await client.query(`ALTER TABLE topup_orders ADD COLUMN IF NOT EXISTS store_currency VARCHAR(10) DEFAULT 'USD'`);
    console.log('- Added store_currency to topup_orders');

    await client.query('COMMIT');
    console.log('Patch successfully applied.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to apply patch:', error);
  } finally {
    client.release();
    pool.end();
  }
}

runPatch();
