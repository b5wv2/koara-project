const { Pool } = require('pg');
const path = require('path');

// Ensure env variables are loaded (in case index.js doesn't run it early enough)
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'koara_db',
    };

const pool = new Pool(poolConfig);

// Log database connection attempts
pool.on('connect', () => {
  console.log('PostgreSQL client successfully connected to pool.');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
