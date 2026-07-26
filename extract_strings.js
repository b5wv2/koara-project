import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

let newKeysEn = {};
let newKeysAr = {};

const regex = /language\s*===\s*['"]en['"]\s*\?\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/g;

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').substring(0, 30);
}

walkDir('./src', (filePath) => {
  if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    content = content.replace(regex, (match, enStr, arStr) => {
      let key = slugify(enStr);
      if (!key) key = 'key_' + Math.random().toString(36).substr(2, 5);
      
      // Keep adding a counter if key exists and translations don't match
      let finalKey = key;
      let counter = 1;
      while (newKeysEn[finalKey] && newKeysEn[finalKey] !== enStr) {
        finalKey = key + '_' + counter;
        counter++;
      }
      
      newKeysEn[finalKey] = enStr;
      newKeysAr[finalKey] = arStr;
      
      return `t('${finalKey}')`;
    });

    // Also look for reversed ternary
    const regexAr = /language\s*===\s*['"]ar['"]\s*\?\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/g;
    content = content.replace(regexAr, (match, arStr, enStr) => {
      let key = slugify(enStr);
      if (!key) key = 'key_' + Math.random().toString(36).substr(2, 5);
      
      let finalKey = key;
      let counter = 1;
      while (newKeysEn[finalKey] && newKeysEn[finalKey] !== enStr) {
        finalKey = key + '_' + counter;
        counter++;
      }
      
      newKeysEn[finalKey] = enStr;
      newKeysAr[finalKey] = arStr;
      
      return `t('${finalKey}')`;
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Updated translations in: ${filePath}`);
    }
  }
});

fs.writeFileSync('new_translations.json', JSON.stringify({ en: newKeysEn, ar: newKeysAr }, null, 2));
console.log('Done extracting simple ternaries. Check new_translations.json');
