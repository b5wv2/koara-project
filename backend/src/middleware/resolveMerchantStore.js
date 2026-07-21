const db = require('../config/db');

const resolveMerchantStore = async (req, res, next) => {
  if (req.merchantStoreId) return next();
  if (!req.user || req.user.role !== 'merchant') {
    return res.status(403).json({ error: 'Unauthorized: Merchant access required' });
  }
  try {
    const result = await db.query('SELECT id FROM stores WHERE owner_id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Merchant store not found' });
    }
    req.merchantStoreId = result.rows[0].id;
    next();
  } catch (err) {
    console.error('Error resolving merchant store:', err);
    res.status(500).json({ error: 'Internal server error resolving store' });
  }
};

module.exports = resolveMerchantStore;
