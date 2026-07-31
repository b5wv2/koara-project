const fs = require('fs');
let content = fs.readFileSync('backend/debug_puppeteer.js', 'utf8');
content = content.replace(/\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('backend/debug_puppeteer.js', content);
console.log('Fixed backslashes');
