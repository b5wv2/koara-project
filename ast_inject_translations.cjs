const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const t = require('@babel/types');

const allTextsObj = JSON.parse(fs.readFileSync('C:/Users/Ay166/.gemini/antigravity-ide/brain/fec8c592-3005-40d9-b33f-3445f3d9aa90/scratch/all_hardcoded.json', 'utf8'));
const translationsContent = fs.readFileSync('src/translations.js', 'utf8');

const existingDict = {};
const enMatches = translationsContent.match(/"([^"]+)":\s*"([^"]+)"/g) || [];
enMatches.forEach(m => {
  const match = m.match(/"([^"]+)":\s*"([^"]+)"/);
  if (match) existingDict[match[2]] = match[1];
});

let newKeys = {};

function getKey(text) {
  if (existingDict[text]) return existingDict[text];
  let key = text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').substring(0, 30);
  if (!key) key = 'symbol_' + Buffer.from(text).toString('hex').substring(0, 6);
  if (!existingDict[text] && !newKeys[key]) {
    newKeys[key] = text;
  }
  return key;
}

const propsToTranslate = ['label', 'placeholder', 'title', 'alt'];

for (const [file, strings] of Object.entries(allTextsObj)) {
  let content = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parser.parse(content, {
      sourceType: 'module',
      plugins: ['jsx']
    });
  } catch (e) {
    console.error(`Error parsing ${file}: ${e.message}`);
    continue;
  }

  let modified = false;

  traverse(ast, {
    JSXText(path) {
      const text = path.node.value.replace(/\n/g, '').trim();
      if (text.length > 1 && /[a-zA-Z]/.test(text) && !text.includes('{') && strings.includes(text)) {
        const key = getKey(text);
        path.replaceWith(t.jsxExpressionContainer(
          t.callExpression(t.identifier('t'), [t.stringLiteral(key)])
        ));
        modified = true;
      }
    },
    JSXAttribute(path) {
      if (propsToTranslate.includes(path.node.name.name) && path.node.value && path.node.value.type === 'StringLiteral') {
        const text = path.node.value.value.trim();
        if (text.length > 1 && /[a-zA-Z]/.test(text) && strings.includes(text)) {
          const key = getKey(text);
          path.node.value = t.jsxExpressionContainer(
            t.callExpression(t.identifier('t'), [t.stringLiteral(key)])
          );
          modified = true;
        }
      }
    }
  });

  if (modified) {
    const output = generator(ast, { retainLines: true }, content).code;
    fs.writeFileSync(file, output, 'utf8');
    console.log(`Transformed ${file}`);
  }
}

fs.writeFileSync('C:/Users/Ay166/.gemini/antigravity-ide/brain/fec8c592-3005-40d9-b33f-3445f3d9aa90/scratch/final_new_keys.json', JSON.stringify(newKeys, null, 2), 'utf8');
console.log(`Extracted ${Object.keys(newKeys).length} new keys.`);
