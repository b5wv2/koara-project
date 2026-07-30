const fs = require('fs');

let content = fs.readFileSync('backend/src/routes/merchant.js', 'utf-8');

// We will dynamically replace the HTML generation block.

const htmlGenStart = content.indexOf("step = 'Rendering HTML template';");
const htmlGenEnd = content.indexOf("step = 'Starting Puppeteer browser';");

if (htmlGenStart === -1 || htmlGenEnd === -1) {
  console.log("Could not find HTML generation block.");
  process.exit(1);
}

const newHtmlGenBlock = `step = 'Rendering HTML template';
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
      return \`\${isNaN(parsed) ? '0.00' : parsed.toFixed(2)} USD\`;
    };

    const htmlContent = \`
      <!DOCTYPE html>
      <html lang="\${lang}" dir="\${isAr ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #334155; margin: 0; padding: 40px; text-align: \${isAr ? 'right' : 'left'}; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; flex-direction: \${isAr ? 'row-reverse' : 'row'}; }
          .logo { height: 40px; margin-bottom: 10px; }
          .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
          .meta { text-align: \${isAr ? 'left' : 'right'}; font-size: 12px; color: #64748b; }
          .meta p { margin: 2px 0; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 15px; }
          
          .grid { display: flex; flex-wrap: wrap; gap: 15px; }
          .card { flex: 1; min-width: 150px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .card-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 5px; }
          .card-value { font-size: 18px; font-weight: 700; color: #0f172a; }
          
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #f1f5f9; text-align: \${isAr ? 'right' : 'left'}; padding: 10px; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          .empty-state { text-align: center; padding: 20px; color: #94a3b8; font-style: italic; }
          
          .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          .flex-center { display: flex; justify-content: space-between; flex-direction: \${isAr ? 'row-reverse' : 'row'}; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            \${base64Logo ? \`<img src="\${base64Logo}" class="logo" />\` : ''}
            <h1 class="title">\${t.reportTitle}</h1>
          </div>
          <div class="meta">
            <p><strong>\${t.reportPeriod}:</strong> \${formatDate(store.starts_at)} → \${formatDate(new Date())}</p>
            <p><strong>\${t.subStart}:</strong> \${formatDate(store.starts_at)}</p>
            <p><strong>\${t.generatedAt}:</strong> \${new Date().toLocaleString(isAr ? 'ar-DZ' : 'en-US')}</p>
            <p><strong>\${t.currentPlan}:</strong> \${store.plan.toUpperCase()}</p>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">\${t.storeInfo}</h2>
          <div class="grid">
            <div class="card"><div class="card-label">\${t.storeName}</div><div class="card-value" dir="auto">\${store.store_name}</div></div>
            <div class="card"><div class="card-label">\${t.ownerName}</div><div class="card-value" dir="auto">\${store.owner_name}</div></div>
            <div class="card"><div class="card-label">\${t.storeDomain}</div><div class="card-value" dir="ltr" style="text-align: \${isAr ? 'right' : 'left'}">\${store.subdomain}.getkoara.com</div></div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">\${t.financialSummary}</h2>
          <div class="grid">
            <div class="card"><div class="card-label">\${t.walletBalance}</div><div class="card-value" dir="ltr" style="text-align: \${isAr ? 'right' : 'left'}">\${formatCurrency(store.wallet_balance)}</div></div>
            <div class="card"><div class="card-label">\${t.walletTopups}</div><div class="card-value">\${topupsRes.rows[0].topups_count}</div></div>
            <div class="card"><div class="card-label">\${t.walletDeposited}</div><div class="card-value" dir="ltr" style="text-align: \${isAr ? 'right' : 'left'}">\${formatCurrency(topupsRes.rows[0].total_deposited)}</div></div>
          </div>
          <div class="grid" style="margin-top:15px;">
            <div class="card"><div class="card-label">\${t.totalRevenue}</div><div class="card-value" dir="ltr" style="text-align: \${isAr ? 'right' : 'left'}">\${formatCurrency(o.total_revenue)}</div></div>
            <div class="card"><div class="card-label">\${t.avgOrderVal}</div><div class="card-value" dir="ltr" style="text-align: \${isAr ? 'right' : 'left'}">\${formatCurrency(avgOrderValue)}</div></div>
            <div class="card"><div class="card-label">\${t.totalOrders}</div><div class="card-value">\${o.total_orders}</div></div>
            <div class="card"><div class="card-label">\${t.completedOrders}</div><div class="card-value">\${o.completed_orders}</div></div>
          </div>
          <div class="grid" style="margin-top:15px;">
             <div class="card"><div class="card-label">\${t.pendingOrders}</div><div class="card-value">\${o.pending_orders}</div></div>
             <div class="card"><div class="card-label">\${t.cancelledOrders}</div><div class="card-value">\${o.cancelled_orders}</div></div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">\${t.statistics}</h2>
          <div class="grid">
            <div class="card"><div class="card-label">\${t.bestProduct}</div><div class="card-value" dir="auto">\${productsRes.rows.length > 0 ? productsRes.rows[0].product_name : 'N/A'}</div></div>
            <div class="card"><div class="card-label">\${t.firstOrderDate}</div><div class="card-value" dir="auto">\${formatDate(o.first_order_date)}</div></div>
            <div class="card"><div class="card-label">\${t.latestOrderDate}</div><div class="card-value" dir="auto">\${formatDate(o.latest_order_date)}</div></div>
            <div class="card"><div class="card-label">\${t.avgOrdersDay}</div><div class="card-value" dir="auto">\${avgOrdersPerDay}</div></div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">\${t.productsSummary}</h2>
          \${productsRes.rows.length > 0 ? \`
          <table>
            <thead><tr><th>\${t.productName}</th><th>\${t.qtySold}</th><th>\${t.revenue}</th></tr></thead>
            <tbody>
              \${productsRes.rows.map(p => \`<tr><td dir="auto">\${p.product_name}</td><td>\${p.quantity_sold}</td><td dir="ltr" style="text-align: \${isAr ? 'right' : 'left'}">\${formatCurrency(p.revenue)}</td></tr>\`).join('')}
            </tbody>
          </table>
          \` : \`<div class="empty-state">\${t.noData}</div>\`}
        </div>

        <div class="section">
          <h2 class="section-title">\${t.recentOrders}</h2>
          \${recentOrdersRes.rows.length > 0 ? \`
          <table>
            <thead><tr><th>\${t.orderNum}</th><th>\${t.date}</th><th>\${t.product}</th><th>\${t.qty}</th><th>\${t.amount}</th><th>\${t.status}</th></tr></thead>
            <tbody>
              \${recentOrdersRes.rows.map(ro => \`<tr><td>#\${ro.id}</td><td>\${formatDate(ro.created_at)}</td><td dir="auto">\${ro.product_name}</td><td>\${ro.quantity}</td><td dir="ltr" style="text-align: \${isAr ? 'right' : 'left'}">\${formatCurrency(ro.amount)}</td><td><span style="text-transform:capitalize" dir="auto">\${ro.status}</span></td></tr>\`).join('')}
            </tbody>
          </table>
          \` : \`<div class="empty-state">\${t.noData}</div>\`}
        </div>

        <div class="footer">
          <p class="flex-center" style="justify-content: center; gap: 10px;">
            <span>\${t.reportPeriod}: \${formatDate(store.starts_at)} → \${formatDate(new Date())}</span> | 
            <span>\${t.subStart}: \${formatDate(store.starts_at)}</span> | 
            <span>\${t.expiration}: \${formatDate(store.expires_at)}</span>
          </p>
          <p class="flex-center" style="justify-content: center; gap: 10px;">
            <span>\${t.generatedAt}: \${new Date().toLocaleString(isAr ? 'ar-DZ' : 'en-US')}</span> | 
            <span>\${t.footer4}: \${generationCount + 1} / 20</span>
          </p>
          <p style="margin-top:15px;" class="flex-center" style="justify-content: center; gap: 10px;">
            <span>\${t.footer1}</span> | 
            <span>\${t.footer2}</span>
          </p>
          <p>\${t.footer3}</p>
          <p><a href="https://getkoara.com" style="color:#64748b;text-decoration:none;" dir="ltr">https://getkoara.com</a></p>
        </div>
      </body>
      </html>
    \`;
    
    `;

content = content.substring(0, htmlGenStart) + newHtmlGenBlock + content.substring(htmlGenEnd);
fs.writeFileSync('backend/src/routes/merchant.js', content, 'utf-8');
console.log('Merchant routes patched for PDF.');
