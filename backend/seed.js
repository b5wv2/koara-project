const db = require('./src/config/db');

const defaultCurrencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$', is_base: true },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR', is_base: false },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', is_base: false },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', is_base: false },
  { code: 'SDG', name: 'Sudanese Pound', symbol: 'SDG', is_base: false },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD', is_base: false },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QR', is_base: false },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD', is_base: false },
  { code: 'OMR', name: 'Omani Rial', symbol: 'OMR', is_base: false }
];

async function seed() {
  try {
    for (const c of defaultCurrencies) {
      await db.pool.query(
        'INSERT INTO currencies (code, name, symbol, is_base_currency, is_active) VALUES ($1, $2, $3, $4, true) ON CONFLICT (code) DO NOTHING',
        [c.code, c.name, c.symbol, c.is_base]
      );
    }
    console.log('Seeded successfully!');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

seed();
