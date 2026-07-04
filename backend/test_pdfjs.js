const fs = require('fs');
const path = require('path');
const pdfStatementParser = require('./src/services/pdfStatementParser');

async function testPdfParser() {
  const pdfPath = process.argv[2];
  
  if (!pdfPath) {
    console.error('Usage: node test_pdfjs.js <path_to_pdf>');
    process.exit(1);
  }

  const absolutePath = path.resolve(pdfPath);
  
  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: File not found at ${absolutePath}`);
    process.exit(1);
  }

  console.log(`Loading PDF from: ${absolutePath}`);
  const pdfBuffer = fs.readFileSync(absolutePath);

  try {
    console.log('Starting PDF.js parser...\n');
    const result = await pdfStatementParser.parseBuffer(pdfBuffer);
    
    console.log('\n--- Final JSON Output ---');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('\n--- Parsing Error ---');
    console.error(error);
  }
}

testPdfParser();
