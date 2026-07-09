const subscriptionService = require('../services/subscriptionService');

const requireKoaraPlus = async (req, res, next) => {
  try {
    const storeId = req.merchantStoreId || req.user?.id; // Depends on where this is used. If used on merchant routes, req.merchantStoreId is usually populated by ensureMerchant middleware.

    // Let's rely on req.merchantStoreId if it exists, otherwise check req.store?.id or req.user.storeId
    let targetStoreId = null;
    if (req.merchantStoreId) targetStoreId = req.merchantStoreId;
    else if (req.store && req.store.id) targetStoreId = req.store.id;
    else if (req.user && req.user.role === 'merchant') {
      // Find their store id
      const db = require('../config/db');
      const storeRes = await db.query('SELECT id FROM stores WHERE owner_id = $1', [req.user.id]);
      if (storeRes.rows.length > 0) {
        targetStoreId = storeRes.rows[0].id;
      }
    }

    if (!targetStoreId) {
      return res.status(403).json({ error: 'Store context missing' });
    }

    const sub = await subscriptionService.ensureSubscription(targetStoreId);

    if (sub.plan !== 'plus' || sub.status !== 'active') {
      return res.status(403).json({ error: 'Premium feature locked. Upgrade to Koara Plus required.' });
    }

    // Pass the subscription down if needed
    req.subscription = sub;
    next();
  } catch (err) {
    console.error('Subscription check error:', err);
    res.status(500).json({ error: 'Internal server error during subscription check' });
  }
};

module.exports = {
  requireKoaraPlus
};
