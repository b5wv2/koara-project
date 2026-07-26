import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const cssReplacements = [
  { regex: /(?<![a-zA-Z-])ml-([0-9a-z.-]+)/g, replace: 'ms-$1' },
  { regex: /(?<![a-zA-Z-])mr-([0-9a-z.-]+)/g, replace: 'me-$1' },
  { regex: /(?<![a-zA-Z-])pl-([0-9a-z.-]+)/g, replace: 'ps-$1' },
  { regex: /(?<![a-zA-Z-])pr-([0-9a-z.-]+)/g, replace: 'pe-$1' },
  { regex: /(?<![a-zA-Z-])left-([0-9a-z.-]+)/g, replace: 'start-$1' },
  { regex: /(?<![a-zA-Z-])right-([0-9a-z.-]+)/g, replace: 'end-$1' },
  { regex: /(?<![a-zA-Z-])text-left(?![a-zA-Z-])/g, replace: 'text-start' },
  { regex: /(?<![a-zA-Z-])text-right(?![a-zA-Z-])/g, replace: 'text-end' },
  { regex: /(?<![a-zA-Z-])border-l-([0-9a-z.-]+)/g, replace: 'border-s-$1' },
  { regex: /(?<![a-zA-Z-])border-r-([0-9a-z.-]+)/g, replace: 'border-e-$1' },
  { regex: /(?<![a-zA-Z-])rounded-l-([0-9a-z.-]+)/g, replace: 'rounded-s-$1' },
  { regex: /(?<![a-zA-Z-])rounded-r-([0-9a-z.-]+)/g, replace: 'rounded-e-$1' },
  { regex: /(?<![a-zA-Z-])rounded-tl-([0-9a-z.-]+)/g, replace: 'rounded-ts-$1' },
  { regex: /(?<![a-zA-Z-])rounded-tr-([0-9a-z.-]+)/g, replace: 'rounded-te-$1' },
  { regex: /(?<![a-zA-Z-])rounded-bl-([0-9a-z.-]+)/g, replace: 'rounded-bs-$1' },
  { regex: /(?<![a-zA-Z-])rounded-br-([0-9a-z.-]+)/g, replace: 'rounded-be-$1' },
];

let changedFiles = 0;

walkDir('./src', (filePath) => {
  if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    cssReplacements.forEach(({ regex, replace }) => {
      content = content.replace(regex, replace);
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      changedFiles++;
      console.log(`Updated: ${filePath}`);
    }
  }
});

console.log(`RTL Conversion Complete. ${changedFiles} files updated.`);
