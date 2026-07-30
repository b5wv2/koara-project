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


const puppeteer = require('puppeteer');
const fsModule = require('fs');
const path = require('path');

let browserInstance = null;
async function getBrowser() {
  try {
    if (!browserInstance || !browserInstance.connected) {
      // Graceful fallback for local Windows dev vs Ubuntu Production
      const execPath = fsModule.existsSync('/usr/bin/chromium-browser') ? '/usr/bin/chromium-browser' : undefined;
      console.log(`[REPORT_DEBUG] Launching browser. Executable path: ${execPath || 'Default Puppeteer Chromium'}`);
      
      browserInstance = await puppeteer.launch({ 
        executablePath: execPath,
        headless: 'new', 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
      });
    }
    return browserInstance;
  } catch (err) {
    browserInstance = null;
    throw err;
  }
}


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
    const topupsRes = await db.query(`
      SELECT COUNT(*) as topups_count, COALESCE(SUM(amount), 0) as total_deposited 
      FROM wallet_transactions 
      WHERE store_id = $1 AND transaction_type = 'credit'
    `, [storeId]);
    
    const ordersRes = await db.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders,
        COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as total_revenue,
        MIN(created_at) as first_order_date,
        MAX(created_at) as latest_order_date
      FROM orders 
      WHERE store_id = $1
    `, [storeId]);
    
    const o = ordersRes.rows[0];
    const avgOrderValue = parseInt(o.completed_orders) > 0 ? (parseFloat(o.total_revenue) / parseInt(o.completed_orders)).toFixed(2) : '0.00';
    
    let avgOrdersPerDay = '0.00';
    if (o.first_order_date && o.latest_order_date) {
      const days = Math.max(1, (new Date(o.latest_order_date) - new Date(o.first_order_date)) / (1000 * 60 * 60 * 24));
      avgOrdersPerDay = (parseInt(o.total_orders) / days).toFixed(2);
    }
    
    const productsRes = await db.query(`
      SELECT p.name as product_name, COUNT(o.id) as quantity_sold, COALESCE(SUM(o.amount), 0) as revenue
      FROM orders o
      JOIN products p ON p.id = o.product_id
      WHERE o.store_id = $1 AND o.status = 'completed'
      GROUP BY p.id, p.name
      ORDER BY quantity_sold DESC
    `, [storeId]);
    
    const recentOrdersRes = await db.query(`
      SELECT o.id, o.created_at, p.name as product_name, o.amount, o.status, 1 as quantity
      FROM orders o
      JOIN products p ON p.id = o.product_id
      WHERE o.store_id = $1
      ORDER BY o.created_at DESC
      LIMIT 10
    `, [storeId]);
    
    console.log(`[REPORT_DEBUG] Database queries completed successfully.`);
    
    // 4. HTML PDF Generation
    step = 'Rendering HTML template';
    console.log(`[REPORT_DEBUG] Step: ${step}`);
    const logoPath = path.join(__dirname, '../../../src/assets/koara-logo.svg');
    let base64Logo = '';
    if (fsModule.existsSync(logoPath)) {
      const logoSvg = fsModule.readFileSync(logoPath, 'utf8');
      base64Logo = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;
      console.log(`[REPORT_DEBUG] SVG logo loaded successfully.`);
    } else {
      console.warn(`[REPORT_DEBUG] WARNING: SVG logo NOT FOUND at ${logoPath}`);
    }
    
    const lang = req.query.lang === 'ar' ? 'ar' : 'en';
    const isAr = lang === 'ar';
    
    const t = {
      reportTitle: isAr ? 'التقرير الشهري لكوارا' : 'Koara Monthly Report',
      reportPeriod: isAr ? 'فترة التقرير' : 'Report Period',
      subStart: isAr ? 'بداية الاشتراك' : 'Subscription Start',
      generatedAt: isAr ? 'تاريخ الإصدار' : 'Generated At',
      currentPlan: isAr ? 'خطة الاشتراك الحالية' : 'Current Subscription Plan',
      storeInfo: isAr ? 'معلومات المتجر' : 'Store Information',
      storeName: isAr ? 'اسم المتجر' : 'Store Name',
      ownerName: isAr ? 'اسم المالك' : 'Owner Name',
      storeDomain: isAr ? 'رابط المتجر' : 'Store Domain',
      financialSummary: isAr ? 'الملخص المالي' : 'Financial Summary',
      walletBalance: isAr ? 'رصيد المحفظة الحالي' : 'Current Wallet Balance',
      walletTopups: isAr ? 'إجمالي عمليات شحن المحفظة' : 'Total Wallet Top-ups',
      walletDeposited: isAr ? 'إجمالي المبالغ المودعة في المحفظة' : 'Total Wallet Deposited',
      totalRevenue: isAr ? 'إجمالي الأرباح' : 'Total Revenue',
      avgOrderVal: isAr ? 'متوسط قيمة الطلب' : 'Average Order Value',
      totalOrders: isAr ? 'إجمالي الطلبات' : 'Total Orders',
      completedOrders: isAr ? 'الطلبات المكتملة' : 'Completed Orders',
      pendingOrders: isAr ? 'الطلبات المعلقة' : 'Pending Orders',
      cancelledOrders: isAr ? 'الطلبات الملغاة' : 'Cancelled Orders',
      statistics: isAr ? 'الإحصائيات' : 'Statistics',
      bestProduct: isAr ? 'المنتج الأكثر مبيعاً' : 'Best Selling Product',
      firstOrderDate: isAr ? 'تاريخ أول طلب' : 'First Order Date',
      latestOrderDate: isAr ? 'تاريخ آخر طلب' : 'Latest Order Date',
      avgOrdersDay: isAr ? 'متوسط الطلبات في اليوم' : 'Avg Orders Per Day',
      productsSummary: isAr ? 'ملخص المنتجات' : 'Products Summary',
      productName: isAr ? 'اسم المنتج' : 'Product Name',
      qtySold: isAr ? 'الكمية المباعة' : 'Quantity Sold',
      revenue: isAr ? 'الأرباح' : 'Revenue',
      recentOrders: isAr ? 'أحدث الطلبات' : 'Recent Orders',
      orderNum: isAr ? 'الطلب #' : 'Order #',
      date: isAr ? 'التاريخ' : 'Date',
      product: isAr ? 'المنتج' : 'Product',
      qty: isAr ? 'الكمية' : 'Qty',
      amount: isAr ? 'القيمة' : 'Amount',
      status: isAr ? 'الحالة' : 'Status',
      noData: isAr ? 'لا توجد بيانات متاحة' : 'No data available',
      footer1: isAr ? 'تم الإنشاء تلقائياً بواسطة كوارا' : 'Generated automatically by Koara',
      footer2: isAr ? 'مدعوم من كوارا' : 'Powered by Koara',
      footer3: isAr ? 'هذا التقرير مُصدر إلكترونياً ولا يحتاج إلى توقيع.' : 'This report is electronically generated and does not require a signature.',
      footer4: isAr ? 'التقارير المُصدرة في هذه الدورة' : 'Reports Generated This Cycle',
      expiration: isAr ? 'الانتهاء' : 'Expiration',
    };
    
    const formatDate = (d) => d ? new Date(d).toLocaleDateString(isAr ? 'ar-DZ' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
    const formatCurrency = (v) => {
      const parsed = parseFloat(v);
      return `${isNaN(parsed) ? '0.00' : parsed.toFixed(2)} USD`;
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="${lang}" dir="${isAr ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #334155; margin: 0; padding: 40px; text-align: ${isAr ? 'right' : 'left'}; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; flex-direction: ${isAr ? 'row-reverse' : 'row'}; }
          .logo { height: 40px; margin-bottom: 10px; }
          .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
          .meta { text-align: ${isAr ? 'left' : 'right'}; font-size: 12px; color: #64748b; }
          .meta p { margin: 2px 0; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 15px; }
          
          .grid { display: flex; flex-wrap: wrap; gap: 15px; }
          .card { flex: 1; min-width: 150px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .card-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 5px; }
          .card-value { font-size: 18px; font-weight: 700; color: #0f172a; }
          
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #f1f5f9; text-align: ${isAr ? 'right' : 'left'}; padding: 10px; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          .empty-state { text-align: center; padding: 20px; color: #94a3b8; font-style: italic; }
          
          .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          .flex-center { display: flex; justify-content: space-between; flex-direction: ${isAr ? 'row-reverse' : 'row'}; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            ${base64Logo ? `<img src="${base64Logo}" class="logo" />` : ''}
            <h1 class="title">${t.reportTitle}</h1>
          </div>
          <div class="meta">
            <p><strong>${t.reportPeriod}:</strong> ${formatDate(store.starts_at)} → ${formatDate(new Date())}</p>
            <p><strong>${t.subStart}:</strong> ${formatDate(store.starts_at)}</p>
            <p><strong>${t.generatedAt}:</strong> ${new Date().toLocaleString(isAr ? 'ar-DZ' : 'en-US')}</p>
            <p><strong>${t.currentPlan}:</strong> ${store.plan.toUpperCase()}</p>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">${t.storeInfo}</h2>
          <div class="grid">
            <div class="card"><div class="card-label">${t.storeName}</div><div class="card-value" dir="auto">${store.store_name}</div></div>
            <div class="card"><div class="card-label">${t.ownerName}</div><div class="card-value" dir="auto">${store.owner_name}</div></div>
            <div class="card"><div class="card-label">${t.storeDomain}</div><div class="card-value" dir="ltr" style="text-align: ${isAr ? 'right' : 'left'}">${store.subdomain}.getkoara.com</div></div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">${t.financialSummary}</h2>
          <div class="grid">
            <div class="card"><div class="card-label">${t.walletBalance}</div><div class="card-value" dir="ltr" style="text-align: ${isAr ? 'right' : 'left'}">${formatCurrency(store.wallet_balance)}</div></div>
            <div class="card"><div class="card-label">${t.walletTopups}</div><div class="card-value">${topupsRes.rows[0].topups_count}</div></div>
            <div class="card"><div class="card-label">${t.walletDeposited}</div><div class="card-value" dir="ltr" style="text-align: ${isAr ? 'right' : 'left'}">${formatCurrency(topupsRes.rows[0].total_deposited)}</div></div>
          </div>
          <div class="grid" style="margin-top:15px;">
            <div class="card"><div class="card-label">${t.totalRevenue}</div><div class="card-value" dir="ltr" style="text-align: ${isAr ? 'right' : 'left'}">${formatCurrency(o.total_revenue)}</div></div>
            <div class="card"><div class="card-label">${t.avgOrderVal}</div><div class="card-value" dir="ltr" style="text-align: ${isAr ? 'right' : 'left'}">${formatCurrency(avgOrderValue)}</div></div>
            <div class="card"><div class="card-label">${t.totalOrders}</div><div class="card-value">${o.total_orders}</div></div>
            <div class="card"><div class="card-label">${t.completedOrders}</div><div class="card-value">${o.completed_orders}</div></div>
          </div>
          <div class="grid" style="margin-top:15px;">
             <div class="card"><div class="card-label">${t.pendingOrders}</div><div class="card-value">${o.pending_orders}</div></div>
             <div class="card"><div class="card-label">${t.cancelledOrders}</div><div class="card-value">${o.cancelled_orders}</div></div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">${t.statistics}</h2>
          <div class="grid">
            <div class="card"><div class="card-label">${t.bestProduct}</div><div class="card-value" dir="auto">${productsRes.rows.length > 0 ? productsRes.rows[0].product_name : 'N/A'}</div></div>
            <div class="card"><div class="card-label">${t.firstOrderDate}</div><div class="card-value" dir="auto">${formatDate(o.first_order_date)}</div></div>
            <div class="card"><div class="card-label">${t.latestOrderDate}</div><div class="card-value" dir="auto">${formatDate(o.latest_order_date)}</div></div>
            <div class="card"><div class="card-label">${t.avgOrdersDay}</div><div class="card-value" dir="auto">${avgOrdersPerDay}</div></div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">${t.productsSummary}</h2>
          ${productsRes.rows.length > 0 ? `
          <table>
            <thead><tr><th>${t.productName}</th><th>${t.qtySold}</th><th>${t.revenue}</th></tr></thead>
            <tbody>
              ${productsRes.rows.map(p => `<tr><td dir="auto">${p.product_name}</td><td>${p.quantity_sold}</td><td dir="ltr" style="text-align: ${isAr ? 'right' : 'left'}">${formatCurrency(p.revenue)}</td></tr>`).join('')}
            </tbody>
          </table>
          ` : `<div class="empty-state">${t.noData}</div>`}
        </div>

        <div class="section">
          <h2 class="section-title">${t.recentOrders}</h2>
          ${recentOrdersRes.rows.length > 0 ? `
          <table>
            <thead><tr><th>${t.orderNum}</th><th>${t.date}</th><th>${t.product}</th><th>${t.qty}</th><th>${t.amount}</th><th>${t.status}</th></tr></thead>
            <tbody>
              ${recentOrdersRes.rows.map(ro => `<tr><td>#${ro.id}</td><td>${formatDate(ro.created_at)}</td><td dir="auto">${ro.product_name}</td><td>${ro.quantity}</td><td dir="ltr" style="text-align: ${isAr ? 'right' : 'left'}">${formatCurrency(ro.amount)}</td><td><span style="text-transform:capitalize" dir="auto">${ro.status}</span></td></tr>`).join('')}
            </tbody>
          </table>
          ` : `<div class="empty-state">${t.noData}</div>`}
        </div>

        <div class="footer">
          <p class="flex-center" style="justify-content: center; gap: 10px;">
            <span>${t.reportPeriod}: ${formatDate(store.starts_at)} → ${formatDate(new Date())}</span> | 
            <span>${t.subStart}: ${formatDate(store.starts_at)}</span> | 
            <span>${t.expiration}: ${formatDate(store.expires_at)}</span>
          </p>
          <p class="flex-center" style="justify-content: center; gap: 10px;">
            <span>${t.generatedAt}: ${new Date().toLocaleString(isAr ? 'ar-DZ' : 'en-US')}</span> | 
            <span>${t.footer4}: ${generationCount + 1} / 20</span>
          </p>
          <p style="margin-top:15px;" class="flex-center" style="justify-content: center; gap: 10px;">
            <span>${t.footer1}</span> | 
            <span>${t.footer2}</span>
          </p>
          <p>${t.footer3}</p>
          <p><a href="https://getkoara.com" style="color:#64748b;text-decoration:none;" dir="ltr">https://getkoara.com</a></p>
        </div>
      </body>
      </html>
    `;
    
    step = 'Starting Puppeteer browser';
    console.log(`[REPORT_DEBUG] Step: ${step}`);
    const browser = await getBrowser();
    
    step = 'Creating new page';
    console.log(`[REPORT_DEBUG] Step: ${step}`);
    const page = await browser.newPage();
    
    step = 'Generating PDF';
    console.log(`[REPORT_DEBUG] Step: ${step}`);
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ 
      format: "A4", 
      printBackground: true 
    });
    
    console.log('[REPORT_DEBUG] Buffer.isBuffer(pdfBuffer):', Buffer.isBuffer(pdfBuffer));
    console.log('[REPORT_DEBUG] pdfBuffer.length:', pdfBuffer.length);
    fsModule.writeFileSync('test-report.pdf', pdfBuffer);
    
    step = 'Closing page';
    console.log(`[REPORT_DEBUG] Step: ${step}`);
    await page.close();
    
    step = 'Inserting database generation log';
    console.log(`[REPORT_DEBUG] Step: ${step}`);
    await db.query(`
      INSERT INTO report_generations (store_id, subscription_id, period_start, period_end)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `, [storeId, store.sub_id, store.starts_at]);
    
    step = 'Streaming PDF successfully';
    console.log(`[REPORT_DEBUG] Step: ${step}`);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Koara_Report.pdf"'
    );
    res.setHeader("Content-Length", pdfBuffer.length);

    console.log(`[REPORT_DEBUG] Report flow completed successfully.`);
    return res.end(pdfBuffer);
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
