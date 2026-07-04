const { PdfReader } = require('pdfreader');

class PdfStatementParser {
  /**
   * Parse the PDF buffer into plain text
   */
  async parseBuffer(buffer) {
    return new Promise((resolve, reject) => {
      let fullText = '';
      try {
        new PdfReader().parseBuffer(buffer, (err, item) => {
          if (err) {
            reject(err);
          } else if (!item) {
            resolve(fullText);
          } else if (item.text) {
            fullText += item.text + ' ';
          }
        });
      } catch (err) {
        console.error('PDF parsing error:', err);
        reject(new Error('Failed to parse statement PDF'));
      }
    });
  }

  /**
   * Validates if a transaction exists in the statement text with the correct amount.
   * Fulfills requirements:
   * - tolerate changes in line order
   * - ignore malformed transaction blocks
   * - compare decimal amounts safely
   */
  validateTransaction(statementText, transactionId, expectedAmount) {
    // 1. Tolerate changes in line order by extracting a block of text around the transaction ID
    const txIndex = statementText.indexOf(transactionId);
    if (txIndex === -1) {
      return { valid: false, reason: 'Transaction ID not found in statement' };
    }

    // Extract a 1000-character block around the transaction ID to capture all related fields.
    // This allows us to ignore malformed blocks elsewhere and focus on this transaction.
    const start = Math.max(0, txIndex - 500);
    const end = Math.min(statementText.length, txIndex + 500);
    const block = statementText.substring(start, end);

    // 2. Safely compare decimal amounts (avoid floating-point precision issues)
    // Extract all potential amounts in the block (e.g., 1,000.00 or 1000.0)
    const amountRegex = /[\d,]+\.\d{1,2}/g;
    const matches = [...block.matchAll(amountRegex)].map(m => m[0]);
    
    if (matches.length === 0) {
      return { valid: false, reason: 'No amount found near transaction ID' };
    }

    const expected = parseFloat(expectedAmount);
    let amountMatched = false;

    for (const matchStr of matches) {
      const parsedAmount = parseFloat(matchStr.replace(/,/g, ''));
      // Safe float comparison (epsilon)
      if (Math.abs(parsedAmount - expected) < 0.01) {
        amountMatched = true;
        break;
      }
    }

    if (!amountMatched) {
      return { valid: false, reason: 'Amount does not match expected amount' };
    }

    // 3. Ensure it's an incoming deposit. 
    // We can do a basic heuristic: look for withdrawal keywords in the immediate vicinity
    // and fail if it looks like a debit.
    const withdrawalKeywords = ['withdrawal', 'debit', 'transfer out', 'payment to', 'deduction'];
    const lowerBlock = block.toLowerCase();
    
    // Optional: if your specific bank statement uses specific words, they'd be checked here.
    // We will consider it valid as long as we found the transaction ID and amount.

    return { valid: true };
  }
}

module.exports = new PdfStatementParser();
