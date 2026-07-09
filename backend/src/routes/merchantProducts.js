const express = require('express');
const router = express.Router();
const db = require('../config/db');
const subscriptionService = require('../services/subscriptionService');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'merchant-product-' + uniqueSuffix + path.extname(file.originalname));
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

// GET /api/merchant/products?store_id=X
// Returns ALL platform products with merchant's enable/price status (LEFT JOIN)
router.get('/', async (req, res) => {
  const { store_id } = req.query;
  if (!store_id) return res.status(400).json({ error: 'store_id is required' });

  try {
    const result = await db.query(`
      SELECT 
        pp.id,
        pp.name,
        pp.category,
        pp.image_url,
        pp.description,
        pp.is_active,
        mp.id AS merchant_product_id,
        mp.selling_price,
        mp.is_enabled,
        mp.custom_title,
        mp.custom_description,
        mp.custom_image_url
      FROM platform_products pp
      LEFT JOIN merchant_products mp ON mp.catalog_product_id = pp.id AND mp.store_id = $1
      WHERE pp.is_active = true
      ORDER BY pp.category ASC, pp.name ASC
    `, [store_id]);

    res.json({ success: true, products: result.rows });
  } catch (err) {
    console.error('Error fetching merchant products:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/merchant/products/:productId — enable/disable or set selling price, title, description, image
router.put('/:productId', async (req, res) => {
  const { productId } = req.params;
  const { store_id, selling_price, is_enabled, custom_title, custom_description, custom_image_url } = req.body;
  if (!store_id) return res.status(400).json({ error: 'store_id is required' });

  try {
    if (custom_title || custom_description || custom_image_url) {
      const sub = await subscriptionService.ensureSubscription(store_id);
      if (sub.plan !== 'plus' || sub.status !== 'active') {
        return res.status(403).json({ error: 'Premium feature locked. Upgrade to Koara Plus required.' });
      }
    }

    // Default selling_price to 0 for new rows if not provided (NOT NULL constraint)
    const priceValue = selling_price !== null && selling_price !== undefined ? selling_price : 0;
    const enabledValue = is_enabled !== null && is_enabled !== undefined ? is_enabled : true;

    // Upsert: insert or update merchant_products row
    const result = await db.query(`
      INSERT INTO merchant_products (
        store_id,
        catalog_product_id,
        selling_price,
        is_enabled,
        custom_title,
        custom_description,
        custom_image_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (store_id, catalog_product_id)
      DO UPDATE SET 
        selling_price = COALESCE($3, merchant_products.selling_price),
        is_enabled = COALESCE($4, merchant_products.is_enabled),
        custom_title = $5,
        custom_description = $6,
        custom_image_url = $7
      RETURNING *
    `, [store_id, productId, priceValue, enabledValue, custom_title || null, custom_description || null, custom_image_url || null]);

    res.json({ success: true, merchant_product: result.rows[0] });
  } catch (err) {
    console.error('Error updating merchant product:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/merchant/products/bulk-enable — enable multiple products at once
router.post('/bulk-enable', async (req, res) => {
  const { store_id, product_ids, default_price } = req.body;
  if (!store_id || !product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
    return res.status(400).json({ error: 'store_id and product_ids array are required' });
  }
  if (!default_price || default_price <= 0) {
    return res.status(400).json({ error: 'default_price must be a positive number' });
  }

  try {
    const values = product_ids.map((pid, i) => `($1, $${i + 3}, $2, true)`).join(', ');
    const params = [store_id, default_price, ...product_ids];
    
    await db.query(`
      INSERT INTO merchant_products (store_id, catalog_product_id, selling_price, is_enabled)
      VALUES ${values}
      ON CONFLICT (store_id, catalog_product_id) DO UPDATE SET is_enabled = true
    `, params);

    res.json({ success: true, message: `${product_ids.length} products enabled` });
  } catch (err) {
    console.error('Error bulk enabling products:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/merchant/products/upload-image
router.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Image file is required' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: imageUrl });
});

module.exports = router;
