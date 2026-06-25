const express = require('express');
const router = express.Router();
const db = require('../config/db');

// =============================================
// Admin Catalog Management — Platform Products
// =============================================

// GET /api/admin/catalog/products — list all platform products
router.get('/products', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM platform_products ORDER BY category ASC, id ASC'
    );
    res.json({ success: true, products: result.rows });
  } catch (err) {
    console.error('Error fetching platform products:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/catalog/products — create a platform product
router.post('/products', async (req, res) => {
  const { name, category, image_url, description, is_active } = req.body;
  if (!name || !category) return res.status(400).json({ error: 'name and category are required' });

  try {
    const result = await db.query(
      `INSERT INTO platform_products (name, category, image_url, description, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, category, image_url || null, description || null, is_active !== undefined ? is_active : true]
    );
    res.status(201).json({ success: true, product: result.rows[0] });
  } catch (err) {
    console.error('Error creating platform product:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/catalog/products/:id — update a platform product
router.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, image_url, description, is_active } = req.body;

  try {
    const result = await db.query(
      `UPDATE platform_products 
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           image_url = COALESCE($3, image_url),
           description = COALESCE($4, description),
           is_active = COALESCE($5, is_active)
       WHERE id = $6 RETURNING *`,
      [name, category, image_url, description, is_active, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    console.error('Error updating platform product:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/catalog/products/:id — deactivate (soft delete)
router.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE platform_products SET is_active = false WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, message: 'Product deactivated' });
  } catch (err) {
    console.error('Error deactivating platform product:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================
// Provider Management
// =============================================

// GET /api/admin/catalog/providers
router.get('/providers', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM providers ORDER BY id ASC');
    res.json({ success: true, providers: result.rows });
  } catch (err) {
    console.error('Error fetching providers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/catalog/providers
router.post('/providers', async (req, res) => {
  const { name, status } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const result = await db.query(
      'INSERT INTO providers (name, status) VALUES ($1, $2) RETURNING *',
      [name, status || 'active']
    );
    res.status(201).json({ success: true, provider: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Provider already exists' });
    console.error('Error creating provider:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/catalog/providers/:id
router.put('/providers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, status } = req.body;

  try {
    const result = await db.query(
      `UPDATE providers SET name = COALESCE($1, name), status = COALESCE($2, status) WHERE id = $3 RETURNING *`,
      [name, status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Provider not found' });
    res.json({ success: true, provider: result.rows[0] });
  } catch (err) {
    console.error('Error updating provider:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================
// Provider-Product Mappings
// =============================================

// GET /api/admin/catalog/products/:id/providers — list mappings for a product
router.get('/products/:id/providers', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      SELECT pp.*, p.name AS provider_name
      FROM provider_products pp
      JOIN providers p ON p.id = pp.provider_id
      WHERE pp.product_id = $1
      ORDER BY pp.is_active DESC, p.name ASC
    `, [id]);
    res.json({ success: true, mappings: result.rows });
  } catch (err) {
    console.error('Error fetching provider mappings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/catalog/products/:id/providers — add a mapping
router.post('/products/:id/providers', async (req, res) => {
  const { id } = req.params;
  const { provider_id, provider_product_id, cost_price, currency_code, is_active } = req.body;
  if (!provider_id || !provider_product_id) {
    return res.status(400).json({ error: 'provider_id and provider_product_id are required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO provider_products (provider_id, product_id, provider_product_id, cost_price, currency_code, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [provider_id, id, provider_product_id, cost_price || null, currency_code || 'USD', is_active !== undefined ? is_active : true]
    );
    res.status(201).json({ success: true, mapping: result.rows[0] });
  } catch (err) {
    console.error('Error creating provider mapping:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/catalog/provider-products/:id — update a mapping
router.put('/provider-products/:id', async (req, res) => {
  const { id } = req.params;
  const { provider_product_id, cost_price, currency_code, is_active } = req.body;

  try {
    const result = await db.query(
      `UPDATE provider_products 
       SET provider_product_id = COALESCE($1, provider_product_id),
           cost_price = COALESCE($2, cost_price),
           currency_code = COALESCE($3, currency_code),
           is_active = COALESCE($4, is_active)
       WHERE id = $5 RETURNING *`,
      [provider_product_id, cost_price, currency_code, is_active, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Mapping not found' });
    res.json({ success: true, mapping: result.rows[0] });
  } catch (err) {
    console.error('Error updating provider mapping:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/catalog/provider-products/:id — deactivate mapping
router.delete('/provider-products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE provider_products SET is_active = false WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Mapping not found' });
    res.json({ success: true, message: 'Mapping deactivated' });
  } catch (err) {
    console.error('Error deactivating provider mapping:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
