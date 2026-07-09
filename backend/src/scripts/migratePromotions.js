const db = require('../config/db');

async function migrate() {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Migrating promos table...');
    // Add new columns to promos
    await client.query(`
      ALTER TABLE promos 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS usage_limit INTEGER DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);

    // Migrate boolean 'active' to 'status' string if 'active' column exists
    const checkActiveCol = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='promos' AND column_name='active';
    `);
    
    if (checkActiveCol.rows.length > 0) {
      console.log('Migrating active boolean to status string...');
      await client.query(`UPDATE promos SET status = 'active' WHERE active = true;`);
      await client.query(`UPDATE promos SET status = 'inactive' WHERE active = false;`);
      await client.query(`ALTER TABLE promos DROP COLUMN active;`);
    }

    // Rename 'type' to 'discount_type' if needed
    const checkTypeCol = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='promos' AND column_name='type';
    `);
    
    if (checkTypeCol.rows.length > 0) {
      console.log('Renaming type to discount_type...');
      // Cannot rename easily if it's referenced by views, but we can do it directly in postgres
      await client.query(`ALTER TABLE promos RENAME COLUMN type TO discount_type;`);
    }

    console.log('Migrating orders and topup_orders tables...');
    // Add columns to orders
    await client.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;
    `);

    // Add columns to topup_orders
    await client.query(`
      ALTER TABLE topup_orders 
      ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
