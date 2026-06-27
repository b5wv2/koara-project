const db = require('./db');

// Raw DDL schema definitions for users and stores tables
const createUsersTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'merchant')),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const createStoresTableQuery = `
  CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    bank_name VARCHAR(255),
    account_name VARCHAR(255),
    account_no VARCHAR(255),
    balance NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const createWalletTransactionsTableQuery = `
  CREATE TABLE IF NOT EXISTS wallet_transactions (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const createStoreRequestsTableQuery = `
  CREATE TABLE IF NOT EXISTS store_requests (
    id SERIAL PRIMARY KEY,
    applicant_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255),
    account_holder_name VARCHAR(255),
    account_number VARCHAR(255),
    kyc_document_url TEXT,
    subdomain VARCHAR(255) UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    reviewed_by INTEGER,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const createEmailVerificationsTableQuery = `
  CREATE TABLE IF NOT EXISTS email_verifications (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('registration', 'password_reset')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const createAuditLogsTableQuery = `
  CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const createEmailLocksTableQuery = `
  CREATE TABLE IF NOT EXISTS email_locks (
    email VARCHAR(255) PRIMARY KEY,
    failed_attempts INTEGER DEFAULT 0,
    lock_count INTEGER DEFAULT 0,
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const createCategoriesTableQuery = `
  CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    icon_text VARCHAR(20),
    logo_url TEXT,
    color VARCHAR(20),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const createProductsTableQuery = `
  CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    sale_price NUMERIC(10,2),
    image_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const createPromosTableQuery = `
  CREATE TABLE IF NOT EXISTS promos (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('percentage','fixed')),
    value NUMERIC(10,2) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_id, code)
  );
`;

const createOrdersTableQuery = `
  CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    whatsapp VARCHAR(50),
    amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

// --- Platform-level product architecture tables ---

const createPlatformProductsTableQuery = `
  CREATE TABLE IF NOT EXISTS platform_products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    image_url TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const createProvidersTableQuery = `
  CREATE TABLE IF NOT EXISTS providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const createProviderProductsTableQuery = `
  CREATE TABLE IF NOT EXISTS provider_products (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER NOT NULL REFERENCES providers(id),
    product_id INTEGER NOT NULL REFERENCES platform_products(id),
    provider_product_id VARCHAR(255) NOT NULL,
    cost_price NUMERIC(10,2),
    currency_code VARCHAR(10) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const createMerchantProductsTableQuery = `
  CREATE TABLE IF NOT EXISTS merchant_products (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    catalog_product_id INTEGER NOT NULL REFERENCES platform_products(id),
    selling_price NUMERIC(10,2) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    custom_title VARCHAR(255),
    custom_description TEXT,
    custom_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_id, catalog_product_id)
  );
`;

// Run initial schema DDL in a transaction
const initializeDatabase = async () => {
  const client = await db.pool.connect();
  const bcrypt = require('bcryptjs');
  try {
    console.log('Initiating database table checks and creation DDL...');

    await client.query('BEGIN');

    // Create users table first
    await client.query(createUsersTableQuery);
    
    // Add Google Auth columns to users table
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE,
      ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email',
      ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    `);

    // Create stores table with reference to users
    await client.query(createStoresTableQuery);

    // Ensure balance column exists if table was already created without it
    await client.query('ALTER TABLE stores ADD COLUMN IF NOT EXISTS balance NUMERIC(10, 2) DEFAULT 0.00;');

    // Create wallet_transactions table
    await client.query(createWalletTransactionsTableQuery);

    // Create store_requests table
    await client.query(createStoreRequestsTableQuery);

    // Ensure subdomain column exists if table was already created without it
    await client.query('ALTER TABLE store_requests ADD COLUMN IF NOT EXISTS subdomain VARCHAR(255) UNIQUE;');

    // Create email_verifications table
    await client.query(createEmailVerificationsTableQuery);
    
    // In case table exists from previous migrations, add new columns
    await client.query('ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;');
    await client.query('ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMP WITH TIME ZONE;');

    // Create audit_logs table
    await client.query(createAuditLogsTableQuery);

    // Create email_locks table
    await client.query(createEmailLocksTableQuery);

    // Create categories, products, promos, orders tables
    await client.query(createCategoriesTableQuery);
    await client.query(createProductsTableQuery);
    await client.query(createPromosTableQuery);
    await client.query(createOrdersTableQuery);

    // Create platform-level product architecture tables
    await client.query(createPlatformProductsTableQuery);
    await client.query(createProvidersTableQuery);
    await client.query(createProviderProductsTableQuery);

    // Fix dirty schema state where merchant_products referenced old catalog_products
    try {
      const constraintCheck = await client.query(`
        SELECT confrelid::regclass::text AS foreign_table
        FROM pg_constraint
        WHERE conname = 'merchant_products_catalog_product_id_fkey'
      `);
      if (constraintCheck.rows.length > 0 && constraintCheck.rows[0].foreign_table === 'catalog_products') {
        console.log('Fixing dirty database state: migrating merchant_products foreign key to platform_products...');
        await client.query('TRUNCATE TABLE merchant_products CASCADE');
        await client.query('ALTER TABLE merchant_products DROP CONSTRAINT merchant_products_catalog_product_id_fkey');
        await client.query('ALTER TABLE merchant_products ADD CONSTRAINT merchant_products_catalog_product_id_fkey FOREIGN KEY (catalog_product_id) REFERENCES platform_products(id)');
      }
    } catch (e) {
      console.warn('Could not check/fix merchant_products constraints:', e.message);
    }

    await client.query(createMerchantProductsTableQuery);

    // Ensure merchant product customization columns exist if the table was created previously
    await client.query(`
      ALTER TABLE merchant_products 
      ADD COLUMN IF NOT EXISTS custom_title VARCHAR(255),
      ADD COLUMN IF NOT EXISTS custom_description TEXT,
      ADD COLUMN IF NOT EXISTS custom_image_url TEXT;
    `);

    // --- Order System Enhancements ---
    await client.query(`CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1`);
    
    await client.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS order_number VARCHAR(50) UNIQUE,
      ADD COLUMN IF NOT EXISTS platform_product_id INTEGER REFERENCES platform_products(id),
      ADD COLUMN IF NOT EXISTS merchant_product_id INTEGER REFERENCES merchant_products(id),
      ADD COLUMN IF NOT EXISTS receipt_url TEXT,
      ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10) DEFAULT 'USD',
      ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES providers(id),
      ADD COLUMN IF NOT EXISTS provider_order_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS provider_status VARCHAR(50),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);

    // Seed super admin user if not exists
    const adminEmail = 'admin@gmil.com';
    const checkAdmin = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (checkAdmin.rows.length === 0) {
      console.log('Seeding super admin user...');
      const adminHash = await bcrypt.hash('admin1234', 10);
      await client.query(`
        INSERT INTO users (name, email, password_hash, role, status)
        VALUES ('Super Admin', $1, $2, 'super_admin', 'active')
      `, [adminEmail, adminHash]);
    }

    // Seed merchant user & store if not exists
    const merchantEmail = 'alfastore@gmail.com';
    const checkMerchant = await client.query('SELECT id FROM users WHERE email = $1', [merchantEmail]);
    if (checkMerchant.rows.length === 0) {
      console.log('Seeding merchant user & store...');
      const merchantHash = await bcrypt.hash('store1234', 10);
      const userResult = await client.query(`
        INSERT INTO users (name, email, password_hash, role, status)
        VALUES ('Alfa Store Owner', $1, $2, 'merchant', 'active')
        RETURNING id
      `, [merchantEmail, merchantHash]);

      const newUserId = userResult.rows[0].id;
      const storeResult = await client.query(`
        INSERT INTO stores (owner_id, store_name, subdomain, status, bank_name, account_name, account_no)
        VALUES ($1, 'Alfa Store', 'alfastore', 'active', 'Chase Bank', 'Alfa Store LLC', '1234567890')
        RETURNING id
      `, [newUserId]);
      const newStoreId = storeResult.rows[0].id;

      // Seed categories for alfastore
      await client.query(`
        INSERT INTO categories (store_id, name, icon_text, color) VALUES
        ($1, 'Free Fire', 'FF', '#FF4C29'),
        ($1, 'PUBG Mobile', 'PUBG', '#F2A154'),
        ($1, 'Netflix', 'NF', '#E50914')
      `, [newStoreId]);

      // Seed products
      await client.query(`
        INSERT INTO products (store_id, category_id, name, price, sale_price, image_url) VALUES
        ($1, (SELECT id FROM categories WHERE store_id = $1 AND name = 'Free Fire'), 'Free Fire Diamonds 100+10', 5.00, null, 'FF'),
        ($1, (SELECT id FROM categories WHERE store_id = $1 AND name = 'PUBG Mobile'), 'PUBG UC 60', 1.00, null, 'PUBG'),
        ($1, (SELECT id FROM categories WHERE store_id = $1 AND name = 'Netflix'), 'Netflix 1 Month Premium', 8.00, 7.50, 'NF')
      `, [newStoreId]);
      
      // Seed promos
      await client.query(`
        INSERT INTO promos (store_id, code, type, value, active) VALUES
        ($1, 'ALFA10', 'percentage', 10.00, true),
        ($1, 'MINUS1', 'fixed', 1.00, false)
      `, [newStoreId]);
    }

    // --- Seed platform-level product architecture ---
    
    // 1. Seed providers independently
    let providerMap = {};
    const checkProviders = await client.query('SELECT id, name FROM providers');
    if (checkProviders.rows.length === 0) {
      console.log('Seeding providers...');
      const providerResult = await client.query(`
        INSERT INTO providers (name, status) VALUES
        ('Reloadly', 'active'),
        ('DT One', 'active'),
        ('Ding', 'active')
        RETURNING id, name
      `);
      providerResult.rows.forEach(r => { providerMap[r.name] = r.id; });
    } else {
      checkProviders.rows.forEach(r => { providerMap[r.name] = r.id; });
    }

    // 2. Seed platform products independently
    let productMap = {};
    const checkPlatformProducts = await client.query('SELECT id, name FROM platform_products');
    if (checkPlatformProducts.rows.length === 0) {
      console.log('Seeding platform products...');
      const ppResult = await client.query(`
        INSERT INTO platform_products (name, category, image_url, description, is_active) VALUES
        ('Free Fire 100 Diamonds', 'Free Fire', NULL, 'Free Fire 100 Diamonds top-up', true),
        ('Free Fire 210 Diamonds', 'Free Fire', NULL, 'Free Fire 210 Diamonds top-up', true),
        ('Free Fire 310 Diamonds', 'Free Fire', NULL, 'Free Fire 310 Diamonds top-up', true),
        ('Free Fire 520 Diamonds', 'Free Fire', NULL, 'Free Fire 520 Diamonds top-up', true),
        ('Free Fire 1060 Diamonds', 'Free Fire', NULL, 'Free Fire 1060 Diamonds top-up', true),
        ('Free Fire 2180 Diamonds', 'Free Fire', NULL, 'Free Fire 2180 Diamonds top-up', true),
        ('Free Fire 5600 Diamonds', 'Free Fire', NULL, 'Free Fire 5600 Diamonds top-up', true),
        ('Weekly Membership', 'Free Fire', NULL, 'Free Fire Weekly Membership', true),
        ('Monthly Membership', 'Free Fire', NULL, 'Free Fire Monthly Membership', true),
        ('Level Up Pass', 'Free Fire', NULL, 'Free Fire Level Up Pass', true),
        ('PUBG 60 UC', 'PUBG Mobile', NULL, 'PUBG Mobile 60 UC top-up', true),
        ('PUBG 325 UC', 'PUBG Mobile', NULL, 'PUBG Mobile 325 UC top-up', true),
        ('PUBG 660 UC', 'PUBG Mobile', NULL, 'PUBG Mobile 660 UC top-up', true),
        ('PUBG 1800 UC', 'PUBG Mobile', NULL, 'PUBG Mobile 1800 UC top-up', true),
        ('PUBG 3850 UC', 'PUBG Mobile', NULL, 'PUBG Mobile 3850 UC top-up', true),
        ('PUBG 8100 UC', 'PUBG Mobile', NULL, 'PUBG Mobile 8100 UC top-up', true),
        ('PUBG Prime', 'PUBG Mobile', NULL, 'PUBG Mobile Prime subscription', true),
        ('PUBG Prime Plus', 'PUBG Mobile', NULL, 'PUBG Mobile Prime Plus subscription', true)
        RETURNING id, name
      `);
      ppResult.rows.forEach(r => { productMap[r.name] = r.id; });
    } else {
      checkPlatformProducts.rows.forEach(r => { productMap[r.name] = r.id; });
    }

    // 3. Seed provider_products independently
    const checkProviderProducts = await client.query('SELECT id FROM provider_products LIMIT 1');
    if (checkProviderProducts.rows.length === 0) {
      console.log('Seeding provider_products mappings...');
      const reloadlyId = providerMap['Reloadly'];
      const dtOneId = providerMap['DT One'];
      
      const p520 = productMap['Free Fire 520 Diamonds'];
      const p100 = productMap['Free Fire 100 Diamonds'];
      const pubg60 = productMap['PUBG 60 UC'];
      const pubg325 = productMap['PUBG 325 UC'];

      if (reloadlyId && dtOneId && p520 && p100 && pubg60 && pubg325) {
        await client.query(`
          INSERT INTO provider_products (provider_id, product_id, provider_product_id, cost_price, currency_code, is_active) VALUES
          ($1, $3, '3449', 3.50, 'USD', true),
          ($2, $3, 'FF520', 3.40, 'USD', true),
          ($1, $4, '3450', 1.80, 'USD', true),
          ($1, $5, '3451', 0.50, 'USD', true),
          ($2, $6, 'PUBG60', 0.80, 'USD', true)
        `, [
          reloadlyId,
          dtOneId,
          p520,
          p100,
          pubg60,
          pubg325
        ]);
      } else {
        console.warn('Skipping provider_products seed: missing related provider or platform product records.');
      }
    }

    // 4. Seed merchant_products independently with defensive checks
    const platformCountResult = await client.query('SELECT COUNT(*) FROM platform_products');
    const platformCount = parseInt(platformCountResult.rows[0].count, 10);

    if (platformCount === 0) {
      console.warn('Skipping merchant_products seed: platform_products is empty. Cannot seed without platform catalog.');
    } else {
      const alfaStoreCheck = await client.query("SELECT id FROM stores WHERE subdomain = 'alfastore' LIMIT 1");
      if (alfaStoreCheck.rows.length > 0) {
        const alfaId = alfaStoreCheck.rows[0].id;
        
        const p520 = productMap['Free Fire 520 Diamonds'];
        const p100 = productMap['Free Fire 100 Diamonds'];
        const p1060 = productMap['Free Fire 1060 Diamonds'];
        const pubg60 = productMap['PUBG 60 UC'];
        const pubg325 = productMap['PUBG 325 UC'];

        if (p520 && p100 && p1060 && pubg60 && pubg325) {
          console.log('Seeding merchant_products...');
          await client.query(`
            INSERT INTO merchant_products (store_id, catalog_product_id, selling_price, is_enabled) VALUES
            ($1, $2, 5.00, true),
            ($1, $3, 2.00, true),
            ($1, $4, 8.50, true),
            ($1, $5, 1.50, true),
            ($1, $6, 4.00, true)
            ON CONFLICT (store_id, catalog_product_id) DO NOTHING
          `, [
            alfaId,
            p520,
            p100,
            p1060,
            pubg60,
            pubg325
          ]);
        } else {
          console.warn('Skipping merchant_products seed: specific platform_products required for seeding were not found.');
        }
      }
    }

    await client.query('COMMIT');

    console.log('Database tables verified/created and seeded successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database schema transaction failed, rolled back.', error.message);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = initializeDatabase;
