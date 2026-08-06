const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const traverse = require('@babel/traverse').default;

const doNotTranslate = [
  'Koara', 'NOWPayments', 'Reloadly', 'FazerCards', 'PUBG', 'Free Fire', 'Google Play', 'Apple', 'Visa', 'MasterCard',
  'USD', 'SAR', 'AED', 'API', 'JSON', 'PDF', 'PNG', 'JPG', 'KYC', 'ID', 'TXN', 'Store URL'
];

function shouldTranslate(text) {
  if (!text || text.trim() === '') return false;
  const trimmed = text.trim();
  if (doNotTranslate.includes(trimmed)) return false;
  if (/^[0-9\s\.,%$\-+]+$/.test(trimmed)) return false;
  if (trimmed.length === 1) return false;
  if (/^[a-z_]+$/.test(trimmed)) return false;
  return /[a-zA-Z]/.test(trimmed);
}

function extractFromCode(code) {
  const strings = new Set();
  const ast = babel.parseSync(code, {
    presets: ["@babel/preset-react"],
    filename: 'temp.jsx',
    ast: true
  });

  traverse(ast, {
    JSXText(path) {
      if (shouldTranslate(path.node.value)) {
        strings.add(path.node.value.trim());
      }
    },
    JSXAttribute(path) {
      if (['placeholder', 'title', 'alt', 'label'].includes(path.node.name.name)) {
        if (path.node.value && path.node.value.type === 'StringLiteral') {
          if (shouldTranslate(path.node.value.value)) {
            strings.add(path.node.value.value.trim());
          }
        }
      }
    }
  });

  return Array.from(strings);
}

function processDir(dir, results) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      processDir(p, results);
    } else if (p.endsWith('.jsx')) {
      const code = fs.readFileSync(p, 'utf8');
      const strings = extractFromCode(code);
      if (strings.length > 0) {
        results[p.replace(/\\/g, '/')] = strings;
      }
    }
  }
}

const results = {};
processDir('src/pages/Admin', results);
fs.writeFileSync('admin_audit.json', JSON.stringify({ hardcoded: results }, null, 2));
console.log('Saved admin_audit.json');
