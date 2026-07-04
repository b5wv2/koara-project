const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

class PdfStatementParser {
  /**
   * Reads a PDF buffer using pdfjs-dist, extracts text items, builds rows based on coordinates,
   * groups rows into transaction blocks separated by amounts (+/-), and parses them.
   */
  async parseBuffer(buffer) {
    const uint8Array = new Uint8Array(buffer);
    
    // 1. Read the PDF using pdfjs-dist
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      disableWorker: true,
      useSystemFonts: true
    });
    
    const pdfDoc = await loadingTask.promise;
    
    let totalTextItems = 0;
    const allRows = [];
    
    // 2. Iterate through every page
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      totalTextItems += textContent.items.length;
      
      // 3. Build rows: Group text items by their Y coordinate
      const rowsMap = {};
      for (const item of textContent.items) {
        if (!item.str || item.str.trim() === '') continue;
        
        // Transform [a, b, c, d, e, f] where e is X, f is Y
        const x = item.transform[4];
        // Round Y to handle slight vertical misalignments in PDF generation
        const y = Math.round(item.transform[5]);
        
        if (!rowsMap[y]) {
          rowsMap[y] = [];
        }
        rowsMap[y].push({ x, text: item.str });
      }
      
      // Sort Y coordinates descending (Top to Bottom since Y grows upwards in PDF coordinates)
      const yKeys = Object.keys(rowsMap).map(Number).sort((a, b) => b - a);
      
      // 4. Sort every row by X coordinate
      for (const y of yKeys) {
        rowsMap[y].sort((a, b) => a.x - b.x);
        // Combine text items into a single row string
        const rowStr = rowsMap[y].map(item => item.text).join(' ').replace(/\s+/g, ' ').trim();
        if (rowStr) {
          allRows.push(rowStr);
        }
      }
    }
    
    // 5. Build transaction blocks
    const transactions = [];
    let currentBlock = [];
    
    // A transaction starts whenever a row begins with: + amount or - amount
    const isAmountRow = (str) => /^[+-]\s*\d+(?:,\d{3})*\.\d{2}/.test(str);
    
    for (const row of allRows) {
      if (isAmountRow(row)) {
        if (currentBlock.length > 0) {
          const parsedTx = this._parseBlock(currentBlock);
          if (parsedTx) {
            transactions.push(parsedTx);
          }
        }
        currentBlock = [row]; // Start new block
      } else {
        if (currentBlock.length > 0) {
          currentBlock.push(row);
        }
      }
    }
    
    // Process the last block
    if (currentBlock.length > 0) {
      const parsedTx = this._parseBlock(currentBlock);
      if (parsedTx) {
        transactions.push(parsedTx);
      }
    }
    
    // 6. Logging
    console.log('========== PDF.js ==========');
    console.log(`Pages: ${pdfDoc.numPages}`);
    console.log(`Text items: ${totalTextItems}`);
    console.log(`Rows: ${allRows.length}`);
    console.log(`Transaction blocks: ${transactions.length}`); // Could differ if parse failed, but we use length
    console.log(`Transactions extracted: ${transactions.length}`);
    console.log('============================');
    
    for (const tx of transactions) {
      console.log('Transaction ID:', tx.transaction_id);
      console.log('Amount:', tx.amount);
      console.log('Sign:', tx.sign);
      console.log('Timestamp:', tx.timestamp);
    }
    
    return {
      success: true,
      transactions: transactions
    };
  }

  /**
   * Internal helper to parse a single isolated transaction block
   */
  _parseBlock(lines) {
    const text = lines.join('\n');
    const firstLine = lines[0];
    
    // Extract amount and sign from the first line (the delimiter)
    const amountMatch = firstLine.match(/^([+-])\s*(\d+(?:,\d{3})*\.\d{2})/);
    if (!amountMatch) return null;
    
    const sign = amountMatch[1];
    const amount = parseFloat(amountMatch[2].replace(/,/g, ''));
    
    // Extract transaction_id anywhere in the block (usually 9 digits, fallback to 6-15)
    let tx_id = null;
    const allNumbers = text.match(/\b\d{6,15}\b/g) || [];
    
    for (const num of allNumbers) {
      if (/^\d{9}$/.test(num)) {
        tx_id = num;
        break;
      }
    }
    if (!tx_id && allNumbers.length > 0) {
      tx_id = allNumbers[0];
    }
    
    if (!tx_id) return null; // Transaction ID is mandatory
    
    // Extract timestamp
    let timestamp = '';
    const tsMatch = text.match(/\b(\d{2,4}[-/]\d{2}[-/]\d{2,4}(?:\s+(?:AM|PM)\s+\d{1,2}:\d{2}|\s+\d{1,2}:\d{2}\s+(?:AM|PM))?)\b/i);
    if (tsMatch) {
       timestamp = tsMatch[1];
    } else {
       // Look for timestamp split across lines (e.g. date on one line, time on another)
       const flatText = lines.join(' ').replace(/\s+/g, ' ');
       const tsFlatMatch = flatText.match(/\b(\d{2,4}[-/]\d{2}[-/]\d{2,4}(?:\s+(?:AM|PM)\s+\d{1,2}:\d{2}|\s+\d{1,2}:\d{2}\s+(?:AM|PM))?)\b/i);
       if (tsFlatMatch) timestamp = tsFlatMatch[1];
    }
    
    return {
      transaction_id: tx_id,
      amount: amount,
      sign: sign,
      timestamp: timestamp,
      raw_text: text
    };
  }

  /**
   * Validates if the expected transaction exists in the structured JSON returned by PDF.js
   * (Keep Business Logic Unchanged)
   */
  validateTransaction(parsedJson, transactionId, expectedAmount, merchantId = 'N/A') {
    if (!parsedJson || !parsedJson.transactions) {
      return { valid: false, reason: 'Invalid JSON structure from parser' };
    }

    const transactions = parsedJson.transactions;
    const normExpectedAmount = Number(expectedAmount);
    const normExpectedId = String(transactionId).trim();
    
    console.log('========== VALIDATION ==========');
    console.log(`Incoming transactionId: ${transactionId}`);
    console.log(`Incoming amount: ${expectedAmount}`);
    console.log(`Incoming store_id: ${merchantId}`);
    console.log(`Number of extracted transactions: ${transactions.length}`);

    let matchingTx = null;
    let finalDecision = false;
    let failReason = 'Transaction ID not found in statement';

    for (const tx of transactions) {
      console.log('------------------------');
      console.log('Transaction Object:\n');
      console.log(`transaction_id: ${tx.transaction_id}`);
      console.log(`amount: ${tx.amount}`);
      console.log(`sign: ${tx.sign}`);
      console.log(`timestamp: ${tx.timestamp}\n`);
      console.log('Comparing against request...\n');
      
      const normTxId = String(tx.transaction_id).trim();
      const normTxAmount = Number(tx.amount);
      
      console.log(`Normalized Transaction ID: ${normTxId}`);
      console.log(`Normalized Request ID: ${normExpectedId}\n`);
      
      const isIdMatch = normTxId === normExpectedId;
      const isAmountMatch = Math.abs(normTxAmount - normExpectedAmount) < 0.01;
      const isSignMatch = tx.sign === '+';
      
      console.log(`ID Match: ${isIdMatch}`);
      console.log(`Amount Match: ${isAmountMatch}`);
      console.log(`Sign Match: ${isSignMatch}`);
      console.log('------------------------');
      
      if (isIdMatch) {
         if (!isAmountMatch) {
            failReason = 'Amount does not match expected amount';
         } else if (!isSignMatch) {
            failReason = 'Transaction is a withdrawal/debit, expected a deposit';
         } else {
            matchingTx = tx;
            finalDecision = true;
            failReason = 'None';
         }
      }
    }
    
    console.log(`Found matching transaction: ${finalDecision}`);
    if (!finalDecision) {
      let printReason = failReason;
      if (failReason === 'Transaction ID not found in statement') {
        printReason = 'ID mismatch';
      }
      console.log(`Reason:\n- ${printReason}`);
    } else {
      console.log(`Reason:\n- Valid match found`);
    }
    console.log('========== VALIDATION COMPLETE ==========');

    if (!finalDecision) {
       return { valid: false, reason: failReason };
    }

    return { valid: true };
  }
}

module.exports = new PdfStatementParser();
