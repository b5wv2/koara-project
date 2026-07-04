const pdfStatementParser = require('./pdfStatementParser');
const walletCreditService = require('./walletCreditService');
const axios = require('axios');

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

        return Buffer.from(response.data);

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
      
      // 3. Validate transaction
      const validation = pdfStatementParser.validateTransaction(statementText, transactionId, requestedAmount);
      parsingDuration = Date.now() - parseStart;

      if (!validation.valid) {
        verificationResult = `invalid - ${validation.reason}`;
        throw new Error(`Verification failed: ${validation.reason}`);
      }

      // 4. Atomic Wallet Transaction
      await walletCreditService.processVerifiedLocalTransfer(merchantId, transactionId, requestedAmount);
      
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
    }
  }
}

module.exports = new LocalPaymentService();
