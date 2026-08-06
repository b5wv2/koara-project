const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const tBabel = require('@babel/types');

function walkSync(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      if (!file.includes('node_modules')) filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.jsx')) filelist.push(dirFile);
    }
  }
  return filelist;
}

const files = walkSync('src');
let fixedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (file.includes('src/pages/Admin/') || file.includes('src\\\\pages\\\\Admin\\\\')) continue;

  // Simple check: does it contain 't('
  if (!/\bt\(/.test(content)) continue;

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

  let hasTCall = false;
  let tIsDefined = false;
  let appContextImported = false;

  traverse(ast, {
    CallExpression(path) {
      if (tBabel.isIdentifier(path.node.callee, { name: 't' })) {
        hasTCall = true;
      }
    },
    Identifier(path) {
      // Check if 't' is declared as a variable or parameter
      if (path.node.name === 't') {
        if (
          path.parent.type === 'VariableDeclarator' ||
          path.parent.type === 'FunctionDeclaration' ||
          path.parent.type === 'ArrowFunctionExpression' ||
          path.parent.type === 'ObjectProperty' // Destructuring { t }
        ) {
           // We'll rely on scope binding to check if it's properly defined
        }
      }
    },
    ImportDeclaration(path) {
      if (path.node.source.value.includes('AppContext')) {
        appContextImported = true;
      }
    }
  });

  if (!hasTCall) continue;

  let missingT = false;
  traverse(ast, {
    CallExpression(p) {
      if (tBabel.isIdentifier(p.node.callee, { name: 't' })) {
        if (!p.scope.hasBinding('t')) {
          missingT = true;
        }
      }
    }
  });

  if (missingT) {
    console.log(`${file} is missing 't' definition.`);

    // 1. Ensure useAppContext is imported
    if (!appContextImported) {
      const depth = file.split(path.sep).length - 2; // Rough depth calc relative to src
      let importPath = '../context/AppContext';
      if (depth === 0) importPath = './context/AppContext';
      if (depth === 2) importPath = '../../context/AppContext';
      
      const importAst = parser.parse(`import { useAppContext } from '${importPath}';\n`, { sourceType: 'module' }).program.body[0];
      
      // Insert at the top after other imports
      let lastImportIdx = -1;
      ast.program.body.forEach((node, i) => {
        if (node.type === 'ImportDeclaration') lastImportIdx = i;
      });
      ast.program.body.splice(lastImportIdx + 1, 0, importAst);
    }

    // 2. Inject const { t } = useAppContext(); into the component function
    traverse(ast, {
      FunctionDeclaration(p) {
        // Assume this is the component if it contains JSX or is exported/capitalized
        if (p.node.id && /^[A-Z]/.test(p.node.id.name) && !p.scope.hasBinding('t')) {
          const tDecl = parser.parse(`const { t } = useAppContext();\n`, { sourceType: 'module' }).program.body[0];
          p.node.body.body.unshift(tDecl);
        }
      },
      VariableDeclarator(p) {
        if (p.node.id && /^[A-Z]/.test(p.node.id.name) && (p.node.init.type === 'ArrowFunctionExpression' || p.node.init.type === 'FunctionExpression')) {
          if (!p.scope.hasBinding('t')) {
            const tDecl = parser.parse(`const { t } = useAppContext();\n`, { sourceType: 'module' }).program.body[0];
            if (p.node.init.body.type === 'BlockStatement') {
              p.node.init.body.body.unshift(tDecl);
            } else {
              // Implicit return
              p.node.init.body = tBabel.blockStatement([
                tDecl,
                tBabel.returnStatement(p.node.init.body)
              ]);
            }
          }
        }
      }
    });

    const output = generator(ast, { retainLines: true }, content).code;
    fs.writeFileSync(file, output, 'utf8');
    fixedFiles++;
    console.log(`Fixed missing 't' in ${file}`);
  }
}

console.log(`Audit complete. Fixed ${fixedFiles} files.`);
