const fs = require('fs');

const endpointCode = `
router.get('/reports', async (req, res) => {
  let step = 'Initializing';
  const storeId = req.merchantStoreId;
  console.log(\`[REPORT_DEBUG] Started report generation for store: \${storeId}\`);
  
  try {
    // 1. Plan Enforcement & Store details
    step = 'Authentication passed & Loading active subscription';
    console.log(\`[REPORT_DEBUG] Step: \${step}\`);
    const storeSubRes = await db.query(\`
      SELECT s.*, sub.id as sub_id, sub.plan, sub.status as sub_status, sub.starts_at, sub.expires_at, 
             u.name as owner_name, u.email as owner_email
      FROM stores s
      JOIN users u ON u.id = s.owner_id
      LEFT JOIN subscriptions sub ON sub.store_id = s.id
      WHERE s.id = $1
    \`, [storeId]);
    
    if (storeSubRes.rows.length === 0) return res.status(404).json({ error: 'Store not found' });
    
    const store = storeSubRes.rows[0];
    
    if (!store.sub_id || store.plan !== 'plus' || store.sub_status !== 'active') {
      console.log(\`[REPORT_DEBUG] Blocked: Store is not active Plus.\`);
      return res.status(403).json({ error: 'Detailed Reports are available exclusively for Koara Plus subscribers. Upgrade to Plus to unlock premium business reports.' });
    }
    
    // 2. Quota Enforcement
    step = 'Verifying report quota';
    console.log(\`[REPORT_DEBUG] Step: \${step}\`);
    const countRes = await db.query(\`
      SELECT COUNT(*) as count 
      FROM report_generations 
      WHERE store_id = $1 AND generated_at >= $2 AND generated_at <= $3
    \`, [storeId, store.starts_at, store.expires_at]);
    
    const generationCount = parseInt(countRes.rows[0].count, 10);
    console.log(\`[REPORT_DEBUG] Current generation count: \${generationCount}\`);
    
    if (generationCount >= 20) {
      console.log(\`[REPORT_DEBUG] Quota exceeded (20 reports max).\`);
      return res.status(429).json({ error: 'You have reached your report generation limit for this subscription cycle. Your quota will automatically reset when your subscription renews.' });
    }
    
    // 3. Data Aggregation
    step = 'Completing Database queries';
    console.log(\`[REPORT_DEBUG] Step: \${step}\`);
    const topupsRes = await db.query(\`
      SELECT COUNT(*) as topups_count, COALESCE(SUM(amount), 0) as total_deposited 
      FROM transactions 
      WHERE user_id = $1 AND type = 'wallet_topup' AND status = 'completed'
    \`, [store.owner_id]);
    
    const ordersRes = await db.query(\`
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
    \`, [storeId]);
    
    const o = ordersRes.rows[0];
    const avgOrderValue = parseInt(o.completed_orders) > 0 ? (parseFloat(o.total_revenue) / parseInt(o.completed_orders)).toFixed(2) : '0.00';
    
    let avgOrdersPerDay = '0.00';
    if (o.first_order_date && o.latest_order_date) {
      const days = Math.max(1, (new Date(o.latest_order_date) - new Date(o.first_order_date)) / (1000 * 60 * 60 * 24));
      avgOrdersPerDay = (parseInt(o.total_orders) / days).toFixed(2);
    }
    
    const productsRes = await db.query(\`
      SELECT p.name as product_name, SUM(o.quantity) as quantity_sold, COALESCE(SUM(o.amount), 0) as revenue
      FROM orders o
      JOIN products p ON p.id = o.product_id
      WHERE o.store_id = $1 AND o.status = 'completed'
      GROUP BY p.id, p.name
      ORDER BY quantity_sold DESC
    \`, [storeId]);
    
    const recentOrdersRes = await db.query(\`
      SELECT o.id, o.created_at, p.name as product_name, o.amount, o.status, o.quantity
      FROM orders o
      JOIN products p ON p.id = o.product_id
      WHERE o.store_id = $1
      ORDER BY o.created_at DESC
      LIMIT 10
    \`, [storeId]);
    
    console.log(\`[REPORT_DEBUG] Database queries completed successfully.\`);
    
    // 4. HTML PDF Generation
    step = 'Rendering HTML template';
    console.log(\`[REPORT_DEBUG] Step: \${step}\`);
    const logoPath = path.join(__dirname, '../../../src/assets/koara-logo.svg');
    let base64Logo = '';
    if (fsModule.existsSync(logoPath)) {
      const logoSvg = fsModule.readFileSync(logoPath, 'utf8');
      base64Logo = \`data:image/svg+xml;base64,\${Buffer.from(logoSvg).toString('base64')}\`;
      console.log(\`[REPORT_DEBUG] SVG logo loaded successfully.\`);
    } else {
      console.warn(\`[REPORT_DEBUG] WARNING: SVG logo NOT FOUND at \${logoPath}\`);
    }
    
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
    const formatCurrency = (v) => \`\${parseFloat(v).toFixed(2)} DZD\`;

    const htmlContent = \`
      <!DOCTYPE html>
      <html lang="en" dir="ltr">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #334155; margin: 0; padding: 40px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { height: 40px; margin-bottom: 10px; }
          .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
          .meta { text-align: right; font-size: 12px; color: #64748b; }
          .meta p { margin: 2px 0; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 15px; }
          
          .grid { display: flex; flex-wrap: wrap; gap: 15px; }
          .card { flex: 1; min-width: 150px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .card-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 5px; }
          .card-value { font-size: 18px; font-weight: 700; color: #0f172a; }
          
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #f1f5f9; text-align: left; padding: 10px; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          .empty-state { text-align: center; padding: 20px; color: #94a3b8; font-style: italic; }
          
          .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            \${base64Logo ? \`<img src="\${base64Logo}" class="logo" />\` : ''}
            <h1 class="title">Koara Monthly Report</h1>
          </div>
          <div class="meta">
            <p><strong>Report Period:</strong> \${formatDate(store.starts_at)} → \${formatDate(new Date())}</p>
            <p><strong>Subscription Start:</strong> \${formatDate(store.starts_at)}</p>
            <p><strong>Generated At:</strong> \${new Date().toLocaleString()}</p>
            <p><strong>Current Subscription Plan:</strong> \${store.plan.toUpperCase()}</p>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">Store Information</h2>
          <div class="grid">
            <div class="card"><div class="card-label">Store Name</div><div class="card-value">\${store.store_name}</div></div>
            <div class="card"><div class="card-label">Store ID</div><div class="card-value">\${store.id}</div></div>
            <div class="card"><div class="card-label">Owner Name</div><div class="card-value">\${store.owner_name}</div></div>
            <div class="card"><div class="card-label">Store Domain</div><div class="card-value">\${store.subdomain}.koara.app</div></div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">Financial Summary</h2>
          <div class="grid">
            <div class="card"><div class="card-label">Current Wallet Balance</div><div class="card-value">\${formatCurrency(store.wallet_balance)}</div></div>
            <div class="card"><div class="card-label">Total Wallet Top-ups</div><div class="card-value">\${topupsRes.rows[0].topups_count}</div></div>
            <div class="card"><div class="card-label">Total Wallet Deposited</div><div class="card-value">\${formatCurrency(topupsRes.rows[0].total_deposited)}</div></div>
          </div>
          <div class="grid" style="margin-top:15px;">
            <div class="card"><div class="card-label">Total Revenue</div><div class="card-value">\${formatCurrency(o.total_revenue)}</div></div>
            <div class="card"><div class="card-label">Average Order Value</div><div class="card-value">\${formatCurrency(avgOrderValue)}</div></div>
            <div class="card"><div class="card-label">Total Orders</div><div class="card-value">\${o.total_orders}</div></div>
            <div class="card"><div class="card-label">Completed Orders</div><div class="card-value">\${o.completed_orders}</div></div>
          </div>
          <div class="grid" style="margin-top:15px;">
             <div class="card"><div class="card-label">Pending Orders</div><div class="card-value">\${o.pending_orders}</div></div>
             <div class="card"><div class="card-label">Cancelled Orders</div><div class="card-value">\${o.cancelled_orders}</div></div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">Statistics</h2>
          <div class="grid">
            <div class="card"><div class="card-label">Best Selling Product</div><div class="card-value">\${productsRes.rows.length > 0 ? productsRes.rows[0].product_name : 'N/A'}</div></div>
            <div class="card"><div class="card-label">First Order Date</div><div class="card-value">\${formatDate(o.first_order_date)}</div></div>
            <div class="card"><div class="card-label">Latest Order Date</div><div class="card-value">\${formatDate(o.latest_order_date)}</div></div>
            <div class="card"><div class="card-label">Avg Orders Per Day</div><div class="card-value">\${avgOrdersPerDay}</div></div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">Products Summary</h2>
          \${productsRes.rows.length > 0 ? \`
          <table>
            <thead><tr><th>Product Name</th><th>Quantity Sold</th><th>Revenue</th></tr></thead>
            <tbody>
              \${productsRes.rows.map(p => \`<tr><td>\${p.product_name}</td><td>\${p.quantity_sold}</td><td>\${formatCurrency(p.revenue)}</td></tr>\`).join('')}
            </tbody>
          </table>
          \` : '<div class="empty-state">No data available</div>'}
        </div>

        <div class="section">
          <h2 class="section-title">Recent Orders</h2>
          \${recentOrdersRes.rows.length > 0 ? \`
          <table>
            <thead><tr><th>Order #</th><th>Date</th><th>Product</th><th>Qty</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              \${recentOrdersRes.rows.map(ro => \`<tr><td>#\${ro.id}</td><td>\${formatDate(ro.created_at)}</td><td>\${ro.product_name}</td><td>\${ro.quantity}</td><td>\${formatCurrency(ro.amount)}</td><td><span style="text-transform:capitalize">\${ro.status}</span></td></tr>\`).join('')}
            </tbody>
          </table>
          \` : '<div class="empty-state">No data available</div>'}
        </div>

        <div class="footer">
          <p>Report Period: \${formatDate(store.starts_at)} → \${formatDate(new Date())} &nbsp;|&nbsp; Subscription Start: \${formatDate(store.starts_at)} &nbsp;|&nbsp; Expiration: \${formatDate(store.expires_at)}</p>
          <p>Generated At: \${new Date().toLocaleString()} &nbsp;|&nbsp; Reports Generated This Cycle: \${generationCount + 1} / 20</p>
          <p style="margin-top:15px;">Generated automatically by Koara &nbsp;|&nbsp; Powered by Koara</p>
          <p>This report is electronically generated and does not require a signature.</p>
          <p><a href="https://koara.app" style="color:#64748b;text-decoration:none;">https://koara.app</a></p>
        </div>
      </body>
      </html>
    \`;
    
    step = 'Starting Puppeteer browser';
    console.log(\`[REPORT_DEBUG] Step: \${step}\`);
    const browser = await getBrowser();
    
    step = 'Creating new page';
    console.log(\`[REPORT_DEBUG] Step: \${step}\`);
    const page = await browser.newPage();
    
    step = 'Generating PDF';
    console.log(\`[REPORT_DEBUG] Step: \${step}\`);
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } });
    
    step = 'Closing page';
    console.log(\`[REPORT_DEBUG] Step: \${step}\`);
    await page.close();
    
    step = 'Inserting database generation log';
    console.log(\`[REPORT_DEBUG] Step: \${step}\`);
    await db.query(\`
      INSERT INTO report_generations (store_id, subscription_id, period_start, period_end)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    \`, [storeId, store.sub_id, store.starts_at]);
    
    step = 'Streaming PDF successfully';
    console.log(\`[REPORT_DEBUG] Step: \${step}\`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', \`attachment; filename="Koara_Report_\${store.store_name.replace(/[^a-z0-9]/gi, '_')}_\${new Date().toISOString().split('T')[0]}.pdf"\`);
    res.send(pdfBuffer);
    console.log(\`[REPORT_DEBUG] Report flow completed successfully.\`);
  } catch (err) {
    console.error(\`\\n================= REPORT GENERATION CRASH =================\`);
    console.error(\`Failed at step: \${step}\`);
    console.error(\`Error Message: \${err.message}\`);
    console.error(\`Error Stack:\`);
    console.error(err.stack);
    console.error(\`=============================================================\\n\`);
    res.status(500).json({ error: 'Internal server error. Failed to generate report.' });
  }
});`;

let fileContent = fs.readFileSync('backend/src/routes/merchant.js', 'utf-8');

// Find the start of router.get('/reports'
const startIndex = fileContent.indexOf("router.get('/reports'");
if (startIndex === -1) {
  console.log("Could not find router.get('/reports'");
  process.exit(1);
}

// Find the end of the route
const endIndex = fileContent.indexOf("});", fileContent.indexOf("res.status(500).json", startIndex)) + 3;

fileContent = fileContent.slice(0, startIndex) + endpointCode + fileContent.slice(endIndex);

// Ensure the browser function handles the chromium path gracefully for local dev testing
const oldGetBrowser = `async function getBrowser() {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await puppeteer.launch({ 
      executablePath: '/usr/bin/chromium-browser',
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });
  }
  return browserInstance;
}`;

const newGetBrowser = `async function getBrowser() {
  if (!browserInstance || !browserInstance.isConnected()) {
    // Graceful fallback for local Windows dev vs Ubuntu Production
    const execPath = fsModule.existsSync('/usr/bin/chromium-browser') ? '/usr/bin/chromium-browser' : undefined;
    console.log(\`[REPORT_DEBUG] Launching browser. Executable path: \${execPath || 'Default Puppeteer Chromium'}\`);
    
    browserInstance = await puppeteer.launch({ 
      executablePath: execPath,
      headless: 'new', 
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });
  }
  return browserInstance;
}`;

fileContent = fileContent.replace(oldGetBrowser, newGetBrowser);

fs.writeFileSync('backend/src/routes/merchant.js', fileContent, 'utf-8');
console.log('Logs injected successfully.');
