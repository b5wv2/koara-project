const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');
const execFileAsync = util.promisify(execFile);

class PdfStatementParser {
  /**
   * Spawns Python to parse the PDF buffer and returns structured JSON
   */
  async parseBuffer(buffer) {
    const tempFile = path.join(os.tmpdir(), `koara_stmt_${Date.now()}_${Math.floor(Math.random() * 1000)}.pdf`);
    
    try {
      fs.writeFileSync(tempFile, buffer);
      
      const pythonScriptPath = path.join(__dirname, '../../python/pdf_statement_parser.py');
      
      console.log('========== PYTHON ==========');
      console.log(`Python executable: python3 (fallback: python)`);
      console.log(`Parser path: ${pythonScriptPath}`);
      console.log(`Working directory: ${process.cwd()}`);
      console.log(`Temporary PDF: ${tempFile}`);
      console.log(`Command: python3 ${pythonScriptPath} ${tempFile}`);
      console.log('============================');
      
      let stdout;
      let stderr = '';
      let exitCode = 0;
      const t0 = Date.now();
      
      try {
        const result = await execFileAsync('python3', [pythonScriptPath, tempFile]);
        stdout = result.stdout;
        stderr = result.stderr || '';
      } catch (err) {
        if (err.code === 'ENOENT') {
           try {
             const result = await execFileAsync('python', [pythonScriptPath, tempFile]);
             stdout = result.stdout;
             stderr = result.stderr || '';
           } catch (err2) {
             exitCode = err2.code || 1;
             stdout = err2.stdout || '';
             stderr = err2.stderr || err2.message;
             throw err2;
           }
        } else {
           exitCode = err.code || 1;
           stdout = err.stdout || '';
           stderr = err.stderr || err.message;
           throw err;
        }
      } finally {
        const t1 = Date.now();
        console.log('========== PYTHON RESULT ==========');
        console.log(`Exit Code: ${exitCode}`);
        console.log(`Execution Time: ${t1 - t0}ms`);
        console.log('STDOUT:');
        console.log(stdout);
        console.log('STDERR:');
        console.log(stderr);
        console.log('===================================');
      }
      
      let parsed;
      try {
        parsed = JSON.parse(stdout);
      } catch (err) {
        console.log('Python returned invalid JSON.');
        throw new Error('Python parser returned invalid JSON.');
      }
      
      if (!parsed.success) {
        throw new Error(`Python parsing failed: ${parsed.error}`);
      }
      
      const txs = parsed.transactions || [];
      console.log('========== PARSED DATA ==========');
      console.log(`success: ${parsed.success}`);
      console.log(`Number of transactions: ${txs.length}`);
      
      for (const tx of txs) {
        console.log('--------------------------------');
        console.log(`Transaction ID: ${tx.transaction_id}`);
        console.log(`Amount: ${tx.amount}`);
        console.log(`Sign: ${tx.sign}`);
        console.log(`Timestamp: ${tx.timestamp}`);
      }
      console.log('--------------------------------');
      console.log(`Total transactions extracted: ${txs.length}`);
      console.log('================================');
      
      return parsed;
    } finally {
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
          console.log('Temporary PDF deleted successfully.');
        } catch (e) {
          console.error(`Failed to delete temporary file ${tempFile}:`, e);
        }
      }
      console.log('Python process completed.');
    }
  }

  /**
   * Validates if the expected transaction exists in the structured JSON returned by Python.
   */
  validateTransaction(parsedJson, transactionId, expectedAmount) {
    if (!parsedJson || !parsedJson.transactions) {
      return { valid: false, reason: 'Invalid JSON structure from parser' };
    }

    const transactions = parsedJson.transactions;
    const expected = parseFloat(expectedAmount);
    
    let matchingTx = null;

    for (const tx of transactions) {
      console.log('Checking transaction:');
      console.log(`ID: ${tx.transaction_id}`);
      console.log(`Amount: ${tx.amount}`);
      console.log(`Sign: ${tx.sign}`);
      console.log('Result:');
      
      const isIdMatch = String(tx.transaction_id) === String(transactionId);
      const isAmountMatch = Math.abs(parseFloat(tx.amount) - expected) < 0.01;
      const isSignMatch = tx.sign === '+';
      
      console.log(`ID MATCH: ${isIdMatch ? 'YES' : 'NO'}`);
      console.log(`AMOUNT MATCH: ${isAmountMatch ? 'YES' : 'NO'}`);
      console.log(`SIGN MATCH: ${isSignMatch ? 'YES' : 'NO'}`);
      console.log('------------------------------------');
      
      if (isIdMatch) {
         matchingTx = tx;
      }
    }
    
    if (!matchingTx) {
      console.log('No matching transaction found.');
      return { valid: false, reason: 'Transaction ID not found in statement' };
    }

    const parsedAmount = parseFloat(matchingTx.amount);

    if (Math.abs(parsedAmount - expected) >= 0.01) {
      console.log('No matching transaction found.');
      return { valid: false, reason: 'Amount does not match expected amount' };
    }

    // Check deposit sign
    if (matchingTx.sign === '-') {
      console.log('No matching transaction found.');
      return { valid: false, reason: 'Transaction is a withdrawal/debit, expected a deposit' };
    }
    
    console.log('MATCH FOUND');
    console.log('Matched Transaction:');
    console.log(`ID: ${matchingTx.transaction_id}`);
    console.log(`Amount: ${matchingTx.amount}`);
    console.log(`Sign: ${matchingTx.sign}`);
    console.log(`Timestamp: ${matchingTx.timestamp}`);

    return { valid: true };
  }
}

module.exports = new PdfStatementParser();
