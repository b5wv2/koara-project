const express = require('express');
const router = express.Router();
const db = require('../config/db');
const orderService = require('../services/orderService');
const { requireKoaraPlus } = require('../middleware/subscriptionCheck');
const resolveMerchantStore = require('../middleware/resolveMerchantStore');

router.use(resolveMerchantStore);

// --- Store Settings & Customization ---

// PUT /api/merchant/store
router.put('/store', async (req, res) => {
  const { logo_url, store_name, bank_name, account_name, account_no } = req.body;
  const storeId = req.merchantStoreId;

  try {
    const currentRes = await db.query('SELECT * FROM stores WHERE id = $1', [storeId]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found or unauthorized' });
    }
    const current = currentRes.rows[0];

    const newLogoUrl = logo_url !== undefined ? logo_url : current.logo_url;
    const newStoreName = store_name !== undefined ? store_name : current.store_name;
    const newBankName = bank_name !== undefined ? bank_name : current.bank_name;
    const newAccountName = account_name !== undefined ? account_name : current.account_name;
    const newAccountNo = account_no !== undefined ? account_no : current.account_no;

    const result = await db.query(
      `UPDATE stores 
       SET logo_url = $1, store_name = $2, bank_name = $3, account_name = $4, account_no = $5
       WHERE id = $6 RETURNING *`,
      [newLogoUrl, newStoreName, newBankName, newAccountName, newAccountNo, storeId]
    );
    res.json({ success: true, store: result.rows[0] });
  } catch (err) {
    console.error('Error updating store:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/merchant/store/customization
router.get('/store/customization', async (req, res) => {
  const storeId = req.merchantStoreId;
  try {
    const storeRes = await db.query('SELECT customization, logo_url, store_name FROM stores WHERE id = $1', [storeId]);
    if (storeRes.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }
    const store = storeRes.rows[0];
    const subscriptionService = require('../services/subscriptionService');
    const sub = await subscriptionService.ensureSubscription(storeId);
    const isPlusActive = sub.plan === 'plus' && sub.status === 'active';

    res.json({
      success: true,
      customization: store.customization || {},
      logo_url: store.logo_url || null,
      store_name: store.store_name,
      isPlusActive
    });
  } catch (err) {
    console.error('Error fetching store customization:', err);
    res.status(500).json({ error: 'Internal server error fetching store customization' });
  }
});

// PUT /api/merchant/store/customization
router.put('/store/customization', requireKoaraPlus, async (req, res) => {
  const storeId = req.merchantStoreId;
  const { customization, logo_url } = req.body;

  try {
    const currentRes = await db.query('SELECT customization, logo_url FROM stores WHERE id = $1', [storeId]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }
    const current = currentRes.rows[0];
    const newCustomization = customization && typeof customization === 'object' ? customization : (current.customization || {});
    const newLogoUrl = logo_url !== undefined ? logo_url : current.logo_url;

    const result = await db.query(
      `UPDATE stores SET customization = $1, logo_url = $2 WHERE id = $3 RETURNING *`,
      [newCustomization, newLogoUrl, storeId]
    );

    res.json({
      success: true,
      customization: result.rows[0].customization || {},
      logo_url: result.rows[0].logo_url,
      store: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating store customization:', err);
    res.status(500).json({ error: 'Internal server error updating store customization' });
  }
});

// --- Categories ---

// POST /api/merchant/categories
router.post('/categories', async (req, res) => {
  const { name, icon_text, logo_url, color, active } = req.body;
  const store_id = req.merchantStoreId;
  if (!name) return res.status(400).json({ error: 'name is required' });

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
  const { name, icon_text, logo_url, color, active } = req.body;
  const store_id = req.merchantStoreId;
  
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
  const store_id = req.merchantStoreId;
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
  const { category_id, name, price, sale_price, image_url, active } = req.body;
  const store_id = req.merchantStoreId;
  if (!name || price === undefined) return res.status(400).json({ error: 'Missing required fields' });

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
  const { category_id, name, price, sale_price, image_url, active } = req.body;
  const store_id = req.merchantStoreId;
  
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
  const store_id = req.merchantStoreId; 
  try {
    const result = await db.query('DELETE FROM products WHERE id = $1 AND store_id = $2 RETURNING id', [id, store_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found or access denied' });
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Promotions ---

// [PREMIUM FEATURE] - Get Promos
router.get('/promotions', requireKoaraPlus, async (req, res) => {
  const store_id = req.merchantStoreId;
  try {
    const result = await db.query(
      `SELECT * FROM promos WHERE store_id = $1 ORDER BY created_at DESC`,
      [store_id]
    );
    res.json({ success: true, promotions: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// [PREMIUM FEATURE] - Create Promo
router.post('/promotions', requireKoaraPlus, async (req, res) => {
  const store_id = req.merchantStoreId;
  const { code, discount_type, value, status, usage_limit, expires_at } = req.body;
  
  if (!code || !discount_type || value === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await db.query(
      `INSERT INTO promos (store_id, code, discount_type, value, status, usage_limit, expires_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [store_id, code, discount_type, value, status || 'active', usage_limit || null, expires_at || null]
    );
    res.status(201).json({ success: true, promotion: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Promo code already exists for this store' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// [PREMIUM FEATURE] - Update Promo
router.put('/promotions/:id', requireKoaraPlus, async (req, res) => {
  const { id } = req.params;
  const store_id = req.merchantStoreId;
  const { code, discount_type, value, status, usage_limit, expires_at } = req.body;
  
  try {
    const result = await db.query(
      `UPDATE promos 
       SET code = COALESCE($1, code), 
           discount_type = COALESCE($2, discount_type), 
           value = COALESCE($3, value), 
           status = COALESCE($4, status),
           usage_limit = $5,
           expires_at = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND store_id = $8 RETURNING *`,
      [code, discount_type, value, status, usage_limit || null, expires_at || null, id, store_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Promotion not found or access denied' });
    res.json({ success: true, promotion: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Promo code already exists for this store' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// [PREMIUM FEATURE] - Delete Promo
router.delete('/promotions/:id', requireKoaraPlus, async (req, res) => {
  const { id } = req.params;
  const store_id = req.merchantStoreId; 
  try {
    const result = await db.query('DELETE FROM promos WHERE id = $1 AND store_id = $2 RETURNING id', [id, store_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Promotion not found or access denied' });
    res.json({ success: true, message: 'Promotion deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Orders ---

// GET /api/merchant/orders
router.get('/orders', async (req, res) => {
  console.log('[DEBUG-MERCHANT-ORDERS] Request received for merchant orders endpoint');
  console.log('[DEBUG-MERCHANT-ORDERS] Authenticated user information:', req.user || 'No user info');
  console.log('[DEBUG-MERCHANT-ORDERS] Query parameters:', req.query);
  const store_id = req.merchantStoreId;

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

    console.log('[DEBUG-MERCHANT-ORDERS] Sending API response to frontend, total orders:', allOrders.length);
    res.status(200).json({ success: true, orders: allOrders });
  } catch (err) {
    console.error('Error fetching orders:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/merchant/orders/:id/status
router.put('/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const store_id = req.merchantStoreId;

  if (!status) {
    return res.status(400).json({ error: 'status is required' });
  }

  try {
    const order = await orderService.updateOrderStatus(id, store_id, status);
    res.status(200).json({ success: true, order });
  } catch (err) {
    console.error('Error updating order status:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/merchant/orders/:id/approve
router.post('/orders/:id/approve', async (req, res) => {
  const { id } = req.params;
  const store_id = req.merchantStoreId;

  try {
    const order = await orderService.approveGiftCardOrder(id, store_id);
    res.status(200).json({ success: true, order });
  } catch (err) {
    console.error('Error approving order:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/merchant/orders/:id/reject
router.post('/orders/:id/reject', async (req, res) => {
  const { id } = req.params;
  const store_id = req.merchantStoreId;

  try {
    const order = await orderService.rejectGiftCardOrder(id, store_id);
    res.status(200).json({ success: true, order });
  } catch (err) {
    console.error('Error rejecting order:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// --- Withdrawals ---

// POST /api/merchant/withdraw
router.post('/withdraw', async (req, res) => {
  const storeId = req.merchantStoreId;
  const { amount } = req.body;
  const merchantId = req.user.id;

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Valid amount greater than 0 is required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get store balance and bank details (Snapshot)
    const storeRes = await client.query('SELECT balance, bank_name, account_name, account_no FROM stores WHERE id = $1 FOR UPDATE', [storeId]);
    if (storeRes.rows.length === 0) {
      throw new Error('Store not found');
    }
    
    const store = storeRes.rows[0];

    if (!store.bank_name || !store.account_name || !store.account_no) {
       throw new Error('Bank information is incomplete. Please contact support to set up your bank account.');
    }

    if (parseFloat(store.balance) < parseFloat(amount)) {
      throw new Error('Insufficient wallet balance');
    }

    // 2. Deduct balance immediately
    await client.query('UPDATE stores SET balance = balance - $1 WHERE id = $2', [amount, storeId]);

    // 3. Log wallet transaction
    await client.query(
      `INSERT INTO wallet_transactions (store_id, amount, transaction_type, reason)
       VALUES ($1, $2, 'debit', 'Withdrawal Request')`,
      [storeId, amount]
    );

    // 4. Create withdrawal request (Snapshotting bank info)
    const withdrawRes = await client.query(
      `INSERT INTO withdrawal_requests 
       (store_id, merchant_id, amount, status, bank_holder_name, bank_name, account_number)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6) RETURNING *`,
      [storeId, merchantId, amount, store.account_name, store.bank_name, store.account_no]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, request: withdrawRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error processing withdrawal:', err.message);
    res.status(400).json({ error: err.message || 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
