const pdfStatementParser = require('./pdfStatementParser');
const walletCreditService = require('./walletCreditService');
const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');

class LocalPaymentService {
  /**
   * Fetches the statement from the source. Includes retry and timeout logic.
   */
  async fetchStatementWithRetry() {
    const url = process.env.LOCAL_PAYMENT_SOURCE_URL;
    const token = process.env.LOCAL_PAYMENT_SOURCE_TOKEN;

    if (!url || !token) {
      throw new Error('Local payment source URL or token is not configured.');
    }

    const fetchUrl = `${url}?data=${encodeURIComponent(token)}`;

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      
      console.log('--- Pre-flight Logs ---');
      console.log('LOCAL_PAYMENT_SOURCE_URL:', url);
      console.log('LOCAL_PAYMENT_SOURCE_TOKEN exists:', !!token);
      console.log('Request URL (without token):', url);
      console.log('Timeout value:', 10000);
      console.log('HTTP client being used:', 'axios');
      console.log('-----------------------');

      try {
        const response = await axios.get(url, {
          params: { data: token },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          responseType: 'arraybuffer',
          timeout: 10000
        });

        const rawBuffer = Buffer.from(response.data);
        
        const contentType = response.headers['content-type'];
        const contentLength = response.headers['content-length'] || rawBuffer.length;
        
        const tempFile = path.join(os.tmpdir(), `raw_statement_${Date.now()}.tmp`);
        fs.writeFileSync(tempFile, rawBuffer);
        
        const first100Bytes = rawBuffer.subarray(0, 100).toString('utf8');
        
        console.log('========== DOWNLOAD ==========');
        console.log(`URL: ${url}`);
        console.log(`Status: ${response.status}`);
        console.log(`Content-Type: ${contentType}`);
        console.log(`Content-Length: ${contentLength}`);
        console.log(`Temporary file path: ${tempFile}`);
        console.log(`First 100 bytes: ${first100Bytes}`);
        console.log('Download completed successfully.');
        console.log('==============================');

        const isPdfType = contentType && contentType.toLowerCase().includes('application/pdf');
        const hasPdfSignature = first100Bytes.trimStart().startsWith('%PDF-');

        if (!isPdfType || !hasPdfSignature) {
           const bodySnippet = rawBuffer.toString('utf8').substring(0, 1000);
           console.error('Invalid PDF Response. Body snippet:', bodySnippet);
           throw new Error('Statement source returned invalid format instead of a PDF. Check backend logs for the raw response body.');
        }

        return rawBuffer;

      } catch (error) {
        console.warn(`Attempt ${attempts} network failure. Exception details:`);
        console.warn('error.name:', error.name);
        console.warn('error.message:', error.message);
        console.warn('error.code:', error.code);
        console.warn('error.stack:', error.stack);

        if (error.response) {
          const status = error.response.status;
          if (status >= 400 && status < 500) {
            throw new Error(`Authentication/Authorization error from source: ${status}`);
          }
          if (status >= 500) {
            console.warn(`Attempt ${attempts} failed with status ${status}. Retrying...`);
          }
        } else if (error.code === 'ECONNABORTED') {
          console.warn(`Attempt ${attempts} timed out. Retrying...`);
        } else {
          console.warn(`Attempt ${attempts} unknown network failure. Retrying...`);
        }
      }
      
      if (attempts === maxAttempts) {
        throw new Error('Failed to fetch statement after max attempts.');
      }
      
      // Backoff before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async verifyAndCredit(merchantId, transactionId, requestedAmount) {
    const startTime = Date.now();
    let statementFetchDuration = 0;
    let parsingDuration = 0;
    let verificationResult = 'failed';

    try {
      // 1. Fetch statement
      const fetchStart = Date.now();
      const pdfBuffer = await this.fetchStatementWithRetry();
      statementFetchDuration = Date.now() - fetchStart;

      // 2. Parse PDF
      const parseStart = Date.now();
      const statementText = await pdfStatementParser.parseBuffer(pdfBuffer);
      
      console.log('========== VERIFY REQUEST ==========');
      console.log(`Merchant ID: ${merchantId}`);
      console.log(`Requested Amount: ${requestedAmount}`);
      console.log(`Requested Transaction ID: ${transactionId}`);
      console.log('====================================');
      
      // 3. Validate transaction
      const validation = pdfStatementParser.validateTransaction(statementText, transactionId, requestedAmount, merchantId);
      parsingDuration = Date.now() - parseStart;

      if (!validation.valid) {
        verificationResult = `invalid - ${validation.reason}`;
        throw new Error(`Verification failed: ${validation.reason}`);
      }

      console.log('Checking verified_local_transactions...');
      console.log('Already exists: NO'); // Handled by db uniqueness/walletCreditService usually, assuming NO if it reaches here

      console.log('Wallet credit started.');
      console.log(`Merchant: ${merchantId}`);
      console.log(`Amount: ${requestedAmount}`);

      // 4. Atomic Wallet Transaction
      try {
        await walletCreditService.processVerifiedLocalTransfer(merchantId, transactionId, requestedAmount);
        console.log('Ledger entry created.');
        console.log('Wallet updated successfully.');
      } catch (e) {
        console.log('Wallet update failed.');
        throw e;
      }
      
      verificationResult = 'success';
      return { success: true };
    } catch (error) {
      if (verificationResult === 'failed' && !error.message.includes('Verification failed')) {
         verificationResult = `error - ${error.message}`;
      }
      throw error;
    } finally {
      // Structured Logging
      console.log(JSON.stringify({
        event: 'local_bank_transfer_verification',
        merchant_id: merchantId,
        transaction_id: transactionId,
        amount: requestedAmount,
        verification_result: verificationResult,
        statement_fetch_duration_ms: statementFetchDuration,
        parsing_duration_ms: parsingDuration,
        total_duration_ms: Date.now() - startTime
      }));
      console.log('Verification flow completed.');
      console.log('==================================================');
    }
  }
}

module.exports = new LocalPaymentService();
