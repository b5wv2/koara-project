const express = require('express');
const router = express.Router();
const db = require('../config/db');
const orderService = require('../services/orderService');
const notificationService = require('../services/fcmNotificationService');
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
    const allOrders = await orderService.getAllMergedOrders(store_id);

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

// --- Notifications ---

// POST /api/merchant/device-token
router.post('/device-token', async (req, res) => {
  const merchantId = req.user.id;
  const { deviceToken, platform } = req.body;

  if (!deviceToken) {
    return res.status(400).json({ error: 'deviceToken is required' });
  }

  try {
    const result = await notificationService.registerDeviceToken(merchantId, deviceToken, platform);
    res.status(200).json({ success: true, token: result });
  } catch (err) {
    console.error('Error registering device token:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});


const fsModule = require('fs');
const path = require('path');


router.get('/reports', async (req, res) => {
  let step = 'Initializing';
  const storeId = req.merchantStoreId;
  console.log(`[REPORT_DEBUG] Started report generation for store: ${storeId}`);
  
  try {
    // 1. Plan Enforcement & Store details
    step = 'Authentication passed & Loading active subscription';
    console.log(`[REPORT_DEBUG] Step: ${step}`);
    const storeSubRes = await db.query(`
      SELECT s.*, sub.id as sub_id, sub.plan, sub.status as sub_status, sub.starts_at, sub.expires_at, 
             u.name as owner_name, u.email as owner_email
      FROM stores s
      JOIN users u ON u.id = s.owner_id
      LEFT JOIN subscriptions sub ON sub.store_id = s.id
      WHERE s.id = $1
    `, [storeId]);
    
    if (storeSubRes.rows.length === 0) return res.status(404).json({ error: 'Store not found' });
    
    const store = storeSubRes.rows[0];
    
    if (!store.sub_id || store.plan !== 'plus' || store.sub_status !== 'active') {
      console.log(`[REPORT_DEBUG] Blocked: Store is not active Plus.`);
      return res.status(403).json({ error: 'Detailed Reports are available exclusively for Koara Plus subscribers. Upgrade to Plus to unlock premium business reports.' });
    }
    
    // 2. Quota Enforcement
    step = 'Verifying report quota';
    console.log(`[REPORT_DEBUG] Step: ${step}`);
    const countRes = await db.query(`
      SELECT COUNT(*) as count 
      FROM report_generations 
      WHERE store_id = $1 AND generated_at >= $2 AND generated_at <= $3
    `, [storeId, store.starts_at, store.expires_at]);
    
    const generationCount = parseInt(countRes.rows[0].count, 10);
    console.log(`[REPORT_DEBUG] Current generation count: ${generationCount}`);
    
    if (generationCount >= 20) {
      console.log(`[REPORT_DEBUG] Quota exceeded (20 reports max).`);
      return res.status(429).json({ error: 'You have reached your report generation limit for this subscription cycle. Your quota will automatically reset when your subscription renews.' });
    }
    
    // 3. Data Aggregation
    step = 'Completing Database queries';
    console.log(`[REPORT_DEBUG] Step: ${step}`);
    
    // Fetch lifetime topups (no date limit)
    const topupsRes = await db.query(`
      SELECT COUNT(*) as topups_count, COALESCE(SUM(amount), 0) as total_deposited 
      FROM wallet_transactions 
      WHERE store_id = $1 AND transaction_type = 'credit'
    `, [storeId]);
    
    // Use unified orders for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const allOrders = await orderService.getAllMergedOrders(storeId);
    const recentOrdersFiltered = allOrders.filter(o => new Date(o.created_at) >= thirtyDaysAgo);

    let totalOrders = 0;
    let completedOrders = 0;
    let pendingOrders = 0;
    let processingOrders = 0;
    let rejectedOrders = 0;
    let refundedOrders = 0;
    let grossSales = 0;
    let refundedAmount = 0;
    let firstOrderDate = null;
    let latestOrderDate = null;

    const productMap = {};

    recentOrdersFiltered.forEach(o => {
      totalOrders++;
      const amount = parseFloat(o.total_amount || o.amount || o.selling_price || 0);

      if (!firstOrderDate || new Date(o.created_at) < new Date(firstOrderDate)) firstOrderDate = o.created_at;
      if (!latestOrderDate || new Date(o.created_at) > new Date(latestOrderDate)) latestOrderDate = o.created_at;

      if (o.status === 'completed') {
        completedOrders++;
        grossSales += amount;

        // Group for product summary
        const pName = o.product_name || 'Unknown Product';
        if (!productMap[pName]) productMap[pName] = { product_name: pName, quantity_sold: 0, revenue: 0 };
        productMap[pName].quantity_sold++;
        productMap[pName].revenue += amount;
      } else if (o.status === 'pending') {
        pendingOrders++;
      } else if (o.status === 'processing') {
        processingOrders++;
      } else if (o.status === 'rejected') {
        rejectedOrders++;
      } else if (o.status === 'refunded') {
        refundedOrders++;
        refundedAmount += amount;
      }
    });

    const netSales = grossSales - refundedAmount;
    const avgOrderValue = completedOrders > 0 ? (grossSales / completedOrders).toFixed(2) : '0.00';

    let avgOrdersPerDay = '0.00';
    if (firstOrderDate && latestOrderDate) {
      const days = Math.max(1, (new Date(latestOrderDate) - new Date(firstOrderDate)) / (1000 * 60 * 60 * 24));
      avgOrdersPerDay = (totalOrders / days).toFixed(2);
    }

    const productsSummary = Object.values(productMap).sort((a, b) => b.quantity_sold - a.quantity_sold);
    const latestOrders = recentOrdersFiltered.slice(0, 10);
    
    // CRITICAL: use store.balance, NOT store.wallet_balance
    console.log({
      totalOrders,
      completedOrders,
      rejectedOrders,
      refundedOrders,
      grossSales,
      walletBalance: store.balance,
      productSummary: productsSummary,
      latestOrders: latestOrders
    });
    
    console.log(`[REPORT_DEBUG] Database queries completed successfully.`);
    
    step = 'Inserting database generation log';
    console.log(`[REPORT_DEBUG] Step: ${step}`);
    await db.query(`
      INSERT INTO report_generations (store_id, subscription_id, period_start, period_end)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `, [storeId, store.sub_id, store.starts_at]);
    
    step = 'Returning JSON data successfully';
    console.log(`[REPORT_DEBUG] Step: ${step}`);

    return res.json({
      store: {
        store_name: store.store_name,
        owner_name: store.owner_name,
        subdomain: store.subdomain,
        plan: store.plan,
        balance: store.balance,
        starts_at: store.starts_at,
        expires_at: store.expires_at,
      },
      financialSummary: {
        walletTopups: topupsRes.rows[0].topups_count,
        walletDeposited: topupsRes.rows[0].total_deposited,
        grossSales,
        refundedAmount,
        netSales,
        avgOrderVal: avgOrderValue,
      },
      orderSummary: {
        totalOrders,
        pendingOrders,
        processingOrders,
        completedOrders,
        rejectedOrders,
        refundedOrders,
      },
      statistics: {
        bestProduct: productsSummary.length > 0 ? productsSummary[0].product_name : null,
        firstOrderDate,
        latestOrderDate,
        avgOrdersDay: avgOrdersPerDay,
      },
      productsSummary,
      recentOrders: latestOrders,
      generationCount,
      periodStart: thirtyDaysAgo.toISOString(),
      periodEnd: new Date().toISOString()
    });
  } catch (err) {
    console.error(`\n================= REPORT GENERATION CRASH =================`);
    console.error(`Failed at step: ${step}`);
    console.error(`Error Message: ${err.message}`);
    console.error(`Error Stack:`);
    console.error(err.stack);
    console.error(`=============================================================\n`);
    res.status(500).json({ error: 'Internal server error. Failed to generate report.' });
  }
});

module.exports = router;
