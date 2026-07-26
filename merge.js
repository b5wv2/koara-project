import fs from 'fs';

const oldContent = fs.readFileSync('./src/translations.js', 'utf8');
const newTransRaw = fs.readFileSync('./new_translations.json', 'utf8');
const newTrans = JSON.parse(newTransRaw);

// Instead of dynamic import, let's just parse the object from the file since it's simple
// Remove "export const translations = " and trailing ";"
let jsonStr = oldContent.replace('export const translations = ', '').trim();
if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);

// This is not strictly JSON (keys might not have quotes), but looking at it, it seems to have quoted keys.
// If not, we can parse it using Function
const getTranslations = new Function(`return ${jsonStr}`);
const translations = getTranslations();

translations.en = { ...translations.en, ...newTrans.en };
translations.ar = { ...translations.ar, ...newTrans.ar };

const output = `export const translations = ${JSON.stringify(translations, null, 2)};\n`;
fs.writeFileSync('./src/translations.js', output);
console.log('Merged translations');
