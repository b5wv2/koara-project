const express = require('express');
const router = express.Router();
const db = require('../config/db');
const topupCatalogService = require('../services/topupCatalogService');
const topupOrderService = require('../services/topupOrderService');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-topup-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, 
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

// GET /api/store/:storeId/topups/catalog
router.get('/catalog/:storeId', async (req, res) => {
  const { storeId } = req.params;

  try {
    const catalog = topupCatalogService.getCatalog();
    const dynamicFields = topupCatalogService.getDynamicFields();

    const merchantProductsRes = await db.query(`
      SELECT offer_id, selling_price 
      FROM merchant_topup_products 
      WHERE store_id = $1 AND is_enabled = true
    `, [storeId]);
    
    const merchantMap = {};
    merchantProductsRes.rows.forEach(row => {
      merchantMap[row.offer_id] = row.selling_price;
    });

    const activeOffers = catalog.offers
      .filter(offer => merchantMap[offer.offer_id] !== undefined)
      .map(offer => ({
        offer_id: offer.offer_id,
        name: offer.name,
        selling_price: merchantMap[offer.offer_id]
      }));

    res.json({ 
      success: true, 
      category: {
        id: catalog.category_id,
        name: catalog.name,
        note: catalog.note
      },
      fields: dynamicFields,
      offers: activeOffers 
    });
  } catch (err) {
    console.error('Error fetching storefront topups catalog:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/store/:storeId/topups/order
router.post('/order/:storeId', upload.single('receipt'), async (req, res) => {
  const { storeId } = req.params;
  let { offerId, fields, customerName, customerEmail, whatsapp } = req.body;

  if (!offerId || !fields || !customerName || !customerEmail || !whatsapp) {
    return res.status(400).json({ error: 'Missing required order fields.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Payment receipt is required for top-up orders' });
  }

  const receiptUrl = `/uploads/${req.file.filename}`;

  // If fields is sent via FormData it might be a string
  if (typeof fields === 'string') {
    try {
      fields = JSON.parse(fields);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid fields format' });
    }
  }

  try {
    const result = await topupOrderService.createPendingOrder({
      storeId,
      offerId,
      dynamicFields: fields,
      customerInfo: { name: customerName, email: customerEmail, whatsapp },
      receiptUrl
    });

    res.status(201).json({ success: true, order: result });
  } catch (err) {
    console.error('Checkout failed for topup:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
