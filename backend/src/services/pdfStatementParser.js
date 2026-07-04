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
      
      let stdout;
      try {
        const result = await execFileAsync('python3', [pythonScriptPath, tempFile]);
        stdout = result.stdout;
      } catch (err) {
        // Fallback for Windows local development where 'python3' might not exist
        if (err.code === 'ENOENT') {
           const result = await execFileAsync('python', [pythonScriptPath, tempFile]);
           stdout = result.stdout;
        } else {
           throw new Error(`Python execution failed: ${err.message}`);
        }
      }
      
      let parsed;
      try {
        parsed = JSON.parse(stdout);
      } catch (err) {
        console.error('Raw stdout:', stdout);
        throw new Error('Python parser returned invalid JSON.');
      }
      
      if (!parsed.success) {
        throw new Error(`Python parsing failed: ${parsed.error}`);
      }
      
      return parsed;
    } finally {
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          console.error(`Failed to delete temporary file ${tempFile}:`, e);
        }
      }
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
    
    // Find matching transaction by ID
    const matchingTx = transactions.find(tx => String(tx.transaction_id) === String(transactionId));
    
    if (!matchingTx) {
      return { valid: false, reason: 'Transaction ID not found in statement' };
    }

    // Safely compare amounts
    const expected = parseFloat(expectedAmount);
    const parsedAmount = parseFloat(matchingTx.amount);

    if (Math.abs(parsedAmount - expected) >= 0.01) {
      return { valid: false, reason: 'Amount does not match expected amount' };
    }

    // Check deposit sign
    if (matchingTx.sign === '-') {
      return { valid: false, reason: 'Transaction is a withdrawal/debit, expected a deposit' };
    }

    return { valid: true };
  }
}

module.exports = new PdfStatementParser();
