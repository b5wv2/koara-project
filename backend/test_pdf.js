const fs = require('fs');
const pdfParse = require('pdf-parse');

async function test() {
    try {
        console.log(typeof pdfParse);
        const data1 = await pdfParse(fs.readFileSync('../statement1.pdf'));
        console.log("=== STATEMENT 1 ===");
        console.log(data1.text);
        
        const data2 = await pdfParse(fs.readFileSync('../statement2.pdf'));
        console.log("=== STATEMENT 2 ===");
        console.log(data2.text);
    } catch(err) {
        console.error(err);
    }
}
test();
