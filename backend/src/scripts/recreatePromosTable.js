/**
 * recreatePromosTable.js
 * 
 * Drops the outdated promos table (confirmed empty) and recreates it
 * with the production schema expected by the backend.
 * 
 * Usage:
 *   node backend/src/scripts/recreatePromosTable.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const db = require('../config/db');

async function recreate() {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Dropping existing promos table...');
    await client.query('DROP TABLE IF EXISTS promos CASCADE');

    console.log('Creating promos table with production schema...');
    await client.query(`
      CREATE TABLE promos (
        id SERIAL PRIMARY KEY,
        store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        code VARCHAR(50) NOT NULL,
        discount_type VARCHAR(20) CHECK (discount_type IN ('percentage','fixed')),
        value NUMERIC(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive')),
        usage_limit INTEGER DEFAULT NULL,
        used_count INTEGER DEFAULT 0,
        starts_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(store_id, code)
      );
    `);

    await client.query('COMMIT');
    console.log('✅ promos table recreated successfully.\n');

    // Verify
    console.log('--- Verification ---\n');

    const cols = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'promos' ORDER BY ordinal_position"
    );
    console.log('Columns:');
    cols.rows.forEach(r => console.log('  ' + r.column_name));

    console.log('\nDone.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

recreate();
