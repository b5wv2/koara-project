const express = require('express');
const router = express.Router();
const db = require('../config/db');
const orderService = require('../services/orderService');

// --- Categories ---

// POST /api/merchant/categories
router.post('/categories', async (req, res) => {
  const { store_id, name, icon_text, logo_url, color, active } = req.body;
  if (!store_id || !name) return res.status(400).json({ error: 'store_id and name are required' });

  try {
    const result = await db.query(
      `INSERT INTO categories (store_id, name, icon_text, logo_url, color, active) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [store_id, name, icon_text, logo_url, color, active !== undefined ? active : true]
    );
    res.status(201).json({ success: true, category: result.rows[0] });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/merchant/categories/:id
router.put('/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { store_id, name, icon_text, logo_url, color, active } = req.body;
  
  try {
    const result = await db.query(
      `UPDATE categories 
       SET name = COALESCE($1, name), 
           icon_text = COALESCE($2, icon_text), 
           logo_url = COALESCE($3, logo_url), 
           color = COALESCE($4, color), 
           active = COALESCE($5, active)
       WHERE id = $6 AND store_id = $7 RETURNING *`,
      [name, icon_text, logo_url, color, active, id, store_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Category not found or access denied' });
    res.json({ success: true, category: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/merchant/categories/:id
router.delete('/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { store_id } = req.body; // should ideally be authenticated session storeId
  try {
    const result = await db.query('DELETE FROM categories WHERE id = $1 AND store_id = $2 RETURNING id', [id, store_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Category not found or access denied' });
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Products ---

router.post('/products', async (req, res) => {
  const { store_id, category_id, name, price, sale_price, image_url, active } = req.body;
  if (!store_id || !name || price === undefined) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const result = await db.query(
      `INSERT INTO products (store_id, category_id, name, price, sale_price, image_url, active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [store_id, category_id, name, price, sale_price, image_url, active !== undefined ? active : true]
    );
    res.status(201).json({ success: true, product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { store_id, category_id, name, price, sale_price, image_url, active } = req.body;
  
  try {
    const result = await db.query(
      `UPDATE products 
       SET category_id = COALESCE($1, category_id), 
           name = COALESCE($2, name), 
           price = COALESCE($3, price), 
           sale_price = $4, 
           image_url = COALESCE($5, image_url), 
           active = COALESCE($6, active)
       WHERE id = $7 AND store_id = $8 RETURNING *`,
      [category_id, name, price, sale_price, image_url, active, id, store_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found or access denied' });
    res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { store_id } = req.body; 
  try {
    const result = await db.query('DELETE FROM products WHERE id = $1 AND store_id = $2 RETURNING id', [id, store_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found or access denied' });
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Promos ---

router.post('/promos', async (req, res) => {
  const { store_id, code, type, value, active } = req.body;
  if (!store_id || !code || !type || value === undefined) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const result = await db.query(
      `INSERT INTO promos (store_id, code, type, value, active) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [store_id, code, type, value, active !== undefined ? active : true]
    );
    res.status(201).json({ success: true, promo: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/promos/:id', async (req, res) => {
  const { id } = req.params;
  const { store_id, code, type, value, active } = req.body;
  
  try {
    const result = await db.query(
      `UPDATE promos 
       SET code = COALESCE($1, code), 
           type = COALESCE($2, type), 
           value = COALESCE($3, value), 
           active = COALESCE($4, active)
       WHERE id = $5 AND store_id = $6 RETURNING *`,
      [code, type, value, active, id, store_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Promo not found or access denied' });
    res.json({ success: true, promo: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/promos/:id', async (req, res) => {
  const { id } = req.params;
  const { store_id } = req.body; 
  try {
    const result = await db.query('DELETE FROM promos WHERE id = $1 AND store_id = $2 RETURNING id', [id, store_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Promo not found or access denied' });
    res.json({ success: true, message: 'Promo deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Orders ---

// GET /api/merchant/orders
router.get('/orders', async (req, res) => {
  const { store_id } = req.query;
  
  if (!store_id) {
    return res.status(400).json({ error: 'store_id query parameter is required' });
  }

  try {
    const orders = await orderService.getStoreOrders(store_id);
    const topupOrdersRes = await db.query(`SELECT * FROM topup_orders WHERE store_id = $1 ORDER BY created_at DESC`, [store_id]);
    
    // Map normal orders
    const mappedOrders = orders.map(o => ({
      ...o,
      order_type: 'gift_card'
    }));

    // Map topup orders
    const mappedTopups = topupOrdersRes.rows.map(o => ({
      ...o,
      order_type: 'topup',
      order_number: o.local_order_id,
      product_name: o.offer_id, // we might want to resolve this to actual name on frontend
      total_amount: o.selling_price
    }));

    const allOrders = [...mappedOrders, ...mappedTopups].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.status(200).json({ success: true, orders: allOrders });
  } catch (err) {
    console.error('Error fetching orders:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/merchant/orders/:id/status
router.put('/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { store_id, status } = req.body;

  if (!store_id || !status) {
    return res.status(400).json({ error: 'store_id and status are required' });
  }

  try {
    const order = await orderService.updateOrderStatus(id, store_id, status);
    res.status(200).json({ success: true, order });
  } catch (err) {
    console.error('Error updating order status:', err.message);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
