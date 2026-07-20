const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { validateSubdomainFormat } = require('../utils/subdomainValidation');
const multer = require('multer');
const path = require('path');
const orderService = require('../services/orderService');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB as requested
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed!'));
    }
  }
});

// GET /api/store/check-subdomain/:subdomain
router.get('/check-subdomain/:subdomain', async (req, res) => {
  const { subdomain } = req.params;

  // 1. Format validation
  const validation = validateSubdomainFormat(subdomain);
  if (!validation.isValid) {
    return res.status(200).json({ available: false, error: validation.error });
  }

  const sub = subdomain.toLowerCase().trim();

  try {
    // 2. Check existing active/suspended stores
    const storeCheck = await db.query('SELECT id FROM stores WHERE subdomain = $1', [sub]);
    if (storeCheck.rows.length > 0) {
      return res.status(200).json({ available: false, error: 'Subdomain is already taken.' });
    }

    // 3. Check pending requests
    const requestCheck = await db.query(`SELECT id FROM store_requests WHERE subdomain = $1 AND status = 'pending'`, [sub]);
    if (requestCheck.rows.length > 0) {
      return res.status(200).json({ available: false, error: 'Subdomain is already reserved by a pending request.' });
    }

    // Available
    return res.status(200).json({ available: true });
  } catch (error) {
    console.error('Error checking subdomain availability:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/store/by-subdomain/:subdomain
router.get('/by-subdomain/:subdomain', async (req, res) => {
  const { subdomain } = req.params;
  const sub = (subdomain || '').toLowerCase().trim();

  try {
    const query = `
      SELECT id, store_name, subdomain, status, bank_name, account_name, account_no, logo_url, customization
      FROM stores
      WHERE subdomain = $1
      LIMIT 1
    `;

    const result = await db.query(query, [sub]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    const store = result.rows[0];

    if (store.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Store is currently suspended.'
      });
    }

    return res.status(200).json({
      success: true,
      store
    });

  } catch (error) {
    console.error('Error fetching store by subdomain:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.'
    });
  }
});

// GET /api/store/:storeId/catalog
router.get('/:storeId/catalog', async (req, res) => {
  const { storeId } = req.params;

  try {
    let categoriesRows = [];
    let productsRows = [];
    let promosRows = [];

    // Legacy store-level data (may fail if schema has drifted)
    try {
      const categoriesResult = await db.query(
        `SELECT * FROM categories WHERE store_id = $1 AND active = true ORDER BY id ASC`, 
        [storeId]
      );
      categoriesRows = categoriesResult.rows;
    } catch (e) {
      console.warn('Could not fetch categories:', e.message);
    }

    try {
      const productsResult = await db.query(
        `SELECT * FROM products WHERE store_id = $1 AND active = true ORDER BY id ASC`, 
        [storeId]
      );
      productsRows = productsResult.rows;
    } catch (e) {
      console.warn('Could not fetch legacy products (schema drift):', e.message);
    }

    try {
      const promosResult = await db.query(
        `SELECT code, discount_type, value FROM promos WHERE store_id = $1 AND status = 'active' ORDER BY id ASC`, 
        [storeId]
      );
      promosRows = promosResult.rows;
    } catch (e) {
      console.warn('Could not fetch promos:', e.message);
    }

    // Platform products enabled by this merchant (new architecture)
    const platformProductsResult = await db.query(`
      SELECT 
        pp.id,
        COALESCE(NULLIF(mp.custom_title, ''), pp.name) AS name,
        pp.category,
        COALESCE(NULLIF(mp.custom_image_url, ''), pp.image_url) AS image_url,
        COALESCE(NULLIF(mp.custom_description, ''), pp.description) AS description,
        mp.selling_price
      FROM platform_products pp
      JOIN merchant_products mp ON mp.catalog_product_id = pp.id
      WHERE mp.store_id = $1
        AND mp.is_enabled = true
        AND pp.is_active = true
      ORDER BY pp.category ASC, pp.name ASC
    `, [storeId]);

    res.json({
      success: true,
      categories: categoriesRows,
      products: productsRows,
      promos: promosRows,
      platform_products: platformProductsResult.rows
    });
  } catch (error) {
    console.error('Error fetching store catalog:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ success: false, error: 'Internal server error.', detail: error.message });
  }
});

// POST /api/store/:storeId/orders
router.post('/:storeId/orders', upload.single('receipt'), async (req, res) => {
  const { storeId } = req.params;
  const { customerName, customerEmail, whatsapp, platformProductId, quantity, promoCode } = req.body;

  if (!customerName || !customerEmail || !whatsapp || !platformProductId) {
    return res.status(400).json({ error: 'Missing required fields for order' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Payment receipt is required' });
  }

  const receiptUrl = `/uploads/${req.file.filename}`;

  try {
    const order = await orderService.createOrder({
      storeId,
      customerName,
      customerEmail,
      whatsapp,
      platformProductId,
      quantity: quantity || 1,
      receiptUrl,
      promoCode
    });

    res.status(201).json({ success: true, order });
  } catch (error) {
    console.error('Order creation failed:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
