const fs = require('fs');

let content = fs.readFileSync('backend/src/routes/merchant.js', 'utf-8');

// We want to replace the part from `step = 'Starting Puppeteer browser';` 
// to `return res.end(pdfBuffer);` with the detailed debugging version.

const startStr = "step = 'Starting Puppeteer browser';";
const endStr = "return res.end(pdfBuffer);";

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr) + endStr.length;

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find block to replace");
  process.exit(1);
}

const replacement = `
    // 1. Print generated HTML to a temporary file
    const debugHtmlPath = path.join(__dirname, '../../../report-debug.html');
    fsModule.writeFileSync(debugHtmlPath, htmlContent);
    console.log(\`[PUPPETEER_DIAGNOSIS] HTML saved to \${debugHtmlPath}. Length: \${htmlContent.length} chars\`);
    
    // 5. Print basic stats
    const imgCount = (htmlContent.match(/<img/g) || []).length;
    const tableCount = (htmlContent.match(/<table/g) || []).length;
    console.log(\`[PUPPETEER_DIAGNOSIS] Number of orders: \${totalOrders}\`);
    console.log(\`[PUPPETEER_DIAGNOSIS] Number of product rows: \${productsRes.rows.length}\`);
    console.log(\`[PUPPETEER_DIAGNOSIS] Number of images: \${imgCount}\`);
    console.log(\`[PUPPETEER_DIAGNOSIS] Number of tables: \${tableCount}\`);

    step = 'Starting Puppeteer browser';
    console.log(\`[REPORT_DEBUG] Step: \${step}\`);
    const browser = await getBrowser();
    
    step = 'Creating new page';
    console.log(\`[REPORT_DEBUG] Step: \${step}\`);
    const page = await browser.newPage();
    
    // 3. Enable page event logging
    page.on('console', msg => console.log(\`[PAGE CONSOLE] \${msg.type()}: \${msg.text()}\`));
    page.on('pageerror', error => console.log(\`[PAGE ERROR] \${error.message}\`));
    page.on('requestfailed', request => console.log(\`[PAGE REQUEST FAILED] \${request.url()} - \${request.failure()?.errorText}\`));
    page.on('error', error => console.log(\`[PAGE CRASH ERROR] \${error.message}\`));
    
    step = 'Generating PDF - page.setContent';
    console.log(\`[REPORT_DEBUG] Step: \${step}\`);
    try {
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      console.log("[PUPPETEER_DIAGNOSIS] page.setContent() SUCCESS");
    } catch (e) {
      console.error("[PUPPETEER_DIAGNOSIS] page.setContent() FAILED:", e.message);
      throw e;
    }

    step = 'Generating PDF - page.emulateMediaType';
    console.log(\`[REPORT_DEBUG] Step: \${step}\`);
    try {
      await page.emulateMediaType('screen');
      console.log("[PUPPETEER_DIAGNOSIS] page.emulateMediaType('screen') SUCCESS");
    } catch (e) {
      console.error("[PUPPETEER_DIAGNOSIS] page.emulateMediaType() FAILED:", e.message);
      throw e;
    }

    step = 'Generating PDF - page.pdf';
    console.log(\`[REPORT_DEBUG] Step: \${step}\`);
    let pdfBuffer;
    try {
      pdfBuffer = await page.pdf({ 
        format: "A4", 
        printBackground: true 
      });
      console.log(\`[PUPPETEER_DIAGNOSIS] page.pdf() SUCCESS! Buffer length: \${pdfBuffer.length}\`);
    } catch (e) {
      console.error("[PUPPETEER_DIAGNOSIS] page.pdf() FAILED:", e.message);
      throw e;
    }
    
    console.log('[REPORT_DEBUG] Buffer.isBuffer(pdfBuffer):', Buffer.isBuffer(pdfBuffer));
    console.log('[REPORT_DEBUG] pdfBuffer.length:', pdfBuffer.length);
    fsModule.writeFileSync('test-report.pdf', pdfBuffer);
    
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
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Koara_Report.pdf"'
    );
    res.setHeader("Content-Length", pdfBuffer.length);

    console.log(\`[REPORT_DEBUG] Report flow completed successfully.\`);
    return res.end(pdfBuffer);`;

const newContent = content.substring(0, startIdx) + replacement + content.substring(endIdx);
fs.writeFileSync('backend/src/routes/merchant.js', newContent, 'utf-8');
console.log("Successfully patched merchant.js with debugging steps.");
