const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const client = await pool.connect();
  await client.query("ALTER TABLE store_requests ADD COLUMN IF NOT EXISTS store_currency VARCHAR(10) DEFAULT 'USD'");
  console.log('Added to store_requests!');
  client.release();
  pool.end();
}
run();
