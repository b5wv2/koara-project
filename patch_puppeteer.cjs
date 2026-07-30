const fs = require('fs');

const path = 'backend/src/routes/merchant.js';
let content = fs.readFileSync(path, 'utf-8');

// Add the singleton logic right after the requires
const requires = `const puppeteer = require('puppeteer');
const fsModule = require('fs');
const path = require('path');`;

const singletonInjection = `
let browserInstance = null;
async function getBrowser() {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await puppeteer.launch({ 
      executablePath: '/usr/bin/chromium-browser',
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });
  }
  return browserInstance;
}`;

content = content.replace(requires, requires + '\n' + singletonInjection);

// Replace the old launch/close logic with the new one
const oldPdfLogic = `    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } });
    await browser.close();`;

const newPdfLogic = `    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } });
    await page.close();`;

content = content.replace(oldPdfLogic, newPdfLogic);

// Add error catch 500 without stack trace if puppeteer fails
const oldCatch = `  } catch (err) {
    console.error('Report generation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }`;

const newCatch = `  } catch (err) {
    console.error('Report generation error (Server-side logged):', err.message);
    res.status(500).json({ error: 'Internal server error. Failed to generate report.' });
  }`;

content = content.replace(oldCatch, newCatch);

fs.writeFileSync(path, content, 'utf-8');
console.log('Puppeteer logic patched to singleton!');
