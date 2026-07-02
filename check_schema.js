const db = require('./backend/src/config/db');

async function run() {
  try {
    const res = await db.query("SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'topup_orders';");
    console.log('topup_orders columns:');
    res.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (default: ${r.column_default})`));
    
    const res2 = await db.query("SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'merchant_topup_products';");
    console.log('\nmerchant_topup_products columns:');
    res2.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (default: ${r.column_default})`));
  } finally {
    process.exit(0);
  }
}
run();
