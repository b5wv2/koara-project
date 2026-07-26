const express = require('express');
const router = express.Router();
const db = require('../config/db');
const topupCatalogService = require('../services/topupCatalogService');
const resolveMerchantStore = require('../middleware/resolveMerchantStore');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'topup-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (jpg, png, webp) are allowed!'));
    }
  }
});

router.use(resolveMerchantStore);

// GET /api/merchant/topups?store_id=X
// Returns all catalog topups merged with merchant's specific settings & categories
router.get('/', async (req, res) => {
  const store_id = req.merchantStoreId;

  try {
    const catalogs = topupCatalogService.getCatalogs();
    
    // Fetch merchant's topup products
    const merchantProductsRes = await db.query(`
      SELECT offer_id, selling_price, is_enabled, custom_image_url 
      FROM merchant_topup_products 
      WHERE store_id = $1
    `, [store_id]);
    
    const merchantMap = {};
    merchantProductsRes.rows.forEach(row => {
      merchantMap[row.offer_id] = {
        selling_price: row.selling_price,
        is_enabled: row.is_enabled,
        custom_image_url: row.custom_image_url
      };
    });

    // Fetch merchant's topup categories
    const merchantCategoriesRes = await db.query(`
      SELECT category_id, custom_image_url, custom_description
      FROM merchant_topup_categories
      WHERE store_id = $1
    `, [store_id]);

    const merchantCatMap = {};
    merchantCategoriesRes.rows.forEach(row => {
      merchantCatMap[row.category_id] = {
        custom_image_url: row.custom_image_url,
        custom_description: row.custom_description
      };
    });

    const mergedCategories = catalogs.map(c => {
      const catMeta = merchantCatMap[c.category_id] || {};
      return {
        category_id: c.category_id,
        name: c.name,
        image_url: catMeta.custom_image_url || c.image_url || null,
        custom_image_url: catMeta.custom_image_url || null,
        description: catMeta.custom_description || c.note || ''
      };
    });

    const mergedOffers = [];
    catalogs.forEach(catalog => {
      const catMeta = merchantCatMap[catalog.category_id] || {};
      const categoryImageUrl = catMeta.custom_image_url || catalog.image_url || null;

      catalog.offers.forEach(offer => {
        const mData = merchantMap[offer.offer_id] || {};
        mergedOffers.push({
          ...offer,
          provider: 'FazerCards',
          category_id: catalog.category_id,
          category_name: catalog.name,
          category_image_url: categoryImageUrl,
          image_url: mData.custom_image_url || offer.image_url || categoryImageUrl || null,
          custom_image_url: mData.custom_image_url || null,
          selling_price: mData.selling_price || '',
          is_enabled: mData.is_enabled || false
        });
      });
    });

    res.json({ success: true, topups: mergedOffers, categories: mergedCategories });
  } catch (err) {
    console.error('Error fetching merchant topups:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/merchant/topups/upload-image
router.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Image file is required' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: imageUrl });
});

// PUT /api/merchant/topups/category/:categoryId
router.put('/category/:categoryId', async (req, res) => {
  const { categoryId } = req.params;
  const { custom_image_url, custom_description } = req.body;
  const store_id = req.merchantStoreId;

  try {
    const result = await db.query(`
      INSERT INTO merchant_topup_categories (
        store_id, category_id, custom_image_url, custom_description
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (store_id, category_id)
      DO UPDATE SET 
        custom_image_url = $3,
        custom_description = $4
      RETURNING *
    `, [store_id, categoryId, custom_image_url !== undefined ? custom_image_url : null, custom_description !== undefined ? custom_description : null]);

    res.json({ success: true, category: result.rows[0] });
  } catch (err) {
    console.error('Error updating merchant topup category:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/merchant/topups/:offerId
// Enable/disable and set selling price & custom image URL
router.put('/:offerId', async (req, res) => {
  const { offerId } = req.params;
  const { selling_price, is_enabled, custom_image_url } = req.body;
  const store_id = req.merchantStoreId;

  try {
    const priceValue = selling_price !== null && selling_price !== undefined && selling_price !== '' ? selling_price : 0;
    const enabledValue = is_enabled !== null && is_enabled !== undefined ? is_enabled : true;

    const result = await db.query(`
      INSERT INTO merchant_topup_products (
        store_id, offer_id, selling_price, is_enabled, custom_image_url
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (store_id, offer_id)
      DO UPDATE SET 
        selling_price = $3,
        is_enabled = $4,
        custom_image_url = $5
      RETURNING *
    `, [store_id, offerId, priceValue, enabledValue, custom_image_url !== undefined ? custom_image_url : null]);

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
