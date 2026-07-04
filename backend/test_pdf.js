const fs = require('fs');
const pdfParser = require('./src/services/pdfStatementParser');

async function test() {
    try {
        const text1 = await pdfParser.parseBuffer(fs.readFileSync('../statement1.pdf'));
        console.log("=== STATEMENT 1 ===");
        console.log(text1);
        
        const text2 = await pdfParser.parseBuffer(fs.readFileSync('../statement2.pdf'));
        console.log("=== STATEMENT 2 ===");
        console.log(text2);
    } catch(err) {
        console.error(err);
    }
}
test();
