const express = require('express');
const router = express.Router();
const db = require('../config/db');
const topupCatalogService = require('../services/topupCatalogService');
const resolveMerchantStore = require('../middleware/resolveMerchantStore');

router.use(resolveMerchantStore);

// GET /api/merchant/topups?store_id=X
// Returns all catalog topups merged with merchant's specific settings
router.get('/', async (req, res) => {
  const store_id = req.merchantStoreId;

  try {
    const catalogs = topupCatalogService.getCatalogs();
    
    // Fetch merchant's topup products
    const merchantProductsRes = await db.query(`
      SELECT offer_id, selling_price, is_enabled 
      FROM merchant_topup_products 
      WHERE store_id = $1
    `, [store_id]);
    
    const merchantMap = {};
    merchantProductsRes.rows.forEach(row => {
      merchantMap[row.offer_id] = {
        selling_price: row.selling_price,
        is_enabled: row.is_enabled
      };
    });

    const mergedOffers = [];
    catalogs.forEach(catalog => {
      catalog.offers.forEach(offer => {
        const mData = merchantMap[offer.offer_id] || {};
        mergedOffers.push({
          ...offer,
          provider: 'FazerCards', // Static for now based on requirement
          category_id: catalog.category_id,
          category_name: catalog.name,
          selling_price: mData.selling_price || '',
          is_enabled: mData.is_enabled || false
        });
      });
    });

    res.json({ success: true, topups: mergedOffers });
  } catch (err) {
    console.error('Error fetching merchant topups:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/merchant/topups/:offerId
// Enable/disable and set selling price
router.put('/:offerId', async (req, res) => {
  const { offerId } = req.params;
  const { selling_price, is_enabled } = req.body;
  const store_id = req.merchantStoreId;

  try {
    const priceValue = selling_price !== null && selling_price !== undefined && selling_price !== '' ? selling_price : 0;
    const enabledValue = is_enabled !== null && is_enabled !== undefined ? is_enabled : true;

    const result = await db.query(`
      INSERT INTO merchant_topup_products (
        store_id, offer_id, selling_price, is_enabled
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (store_id, offer_id)
      DO UPDATE SET 
        selling_price = $3,
        is_enabled = $4
      RETURNING *
    `, [store_id, offerId, priceValue, enabledValue]);

    res.json({ success: true, topup: result.rows[0] });
  } catch (err) {
    console.error('Error updating merchant topup:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/merchant/topups/orders/:orderId/approve
router.post('/orders/:orderId/approve', async (req, res) => {
  const { orderId } = req.params;
  const store_id = req.merchantStoreId;

  try {
    const topupOrderService = require('../services/topupOrderService');
    const result = await topupOrderService.approveOrder(orderId, store_id);
    res.json(result);
  } catch (err) {
    console.error('Approve order failed:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/merchant/topups/orders/:orderId/reject
router.post('/orders/:orderId/reject', async (req, res) => {
  const { orderId } = req.params;
  const store_id = req.merchantStoreId;

  try {
    const topupOrderService = require('../services/topupOrderService');
    const result = await topupOrderService.rejectOrder(orderId, store_id);
    res.json(result);
  } catch (err) {
    console.error('Reject order failed:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
