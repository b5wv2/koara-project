const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { validateSubdomainFormat } = require('../utils/subdomainValidation');

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
      SELECT id, store_name, subdomain, status, bank_name, account_name, account_no
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
    const categoriesResult = await db.query(
      `SELECT * FROM categories WHERE store_id = $1 AND active = true ORDER BY id ASC`, 
      [storeId]
    );
    const productsResult = await db.query(
      `SELECT * FROM products WHERE store_id = $1 AND active = true ORDER BY id ASC`, 
      [storeId]
    );
    const promosResult = await db.query(
      `SELECT * FROM promos WHERE store_id = $1 AND active = true ORDER BY id ASC`, 
      [storeId]
    );

    // Platform products enabled by this merchant
    const platformProductsResult = await db.query(`
      SELECT 
        pp.id,
        pp.name,
        pp.category,
        pp.image_url,
        pp.description,
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
      categories: categoriesResult.rows,
      products: productsResult.rows,
      promos: promosResult.rows,
      platform_products: platformProductsResult.rows
    });
  } catch (error) {
    console.error('Error fetching store catalog:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

module.exports = router;
