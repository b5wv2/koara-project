const db = require('./src/config/db');

db.pool.query("SELECT conname AS constraint_name, pg_get_constraintdef(c.oid) AS def FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'merchant_products'").then(r => {
  console.log(r.rows);
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
