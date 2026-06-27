const db = require('./backend/src/config/db');

async function migrate() {
  try {
    await db.query(`
      ALTER TABLE merchant_products
      ADD COLUMN IF NOT EXISTS custom_title VARCHAR(255),
      ADD COLUMN IF NOT EXISTS custom_description TEXT,
      ADD COLUMN IF NOT EXISTS custom_image_url TEXT;
    `);
    console.log('Successfully added custom customization columns to merchant_products.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
