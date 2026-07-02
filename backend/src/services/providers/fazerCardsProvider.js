

class FazerCardsProvider {
  constructor() {
    this.apiKey = process.env.API_KEY;
    this.apiUrl = process.env.FAZERCARDS_API_URL || 'https://api.fazercards.com';
  }

  async placeOrder(categoryId, offerId, fields, idempotencyKey) {
    if (!this.apiKey) {
      throw new Error('FazerCards API_KEY is not configured in the environment.');
    }

    const baseUrl = this.apiUrl.endsWith('/') ? this.apiUrl.slice(0, -1) : this.apiUrl;
    const urlPath = baseUrl.endsWith('/api/v2') ? '/topups/order' : '/api/v2/topups/order';
    const url = `${baseUrl}${urlPath}`;
    const body = {
      category_id: categoryId,
      offer_id: offerId,
      fields: fields
    };

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Key': this.apiKey,
      'Idempotency-Key': idempotencyKey || Date.now().toString()
    };

    console.log('\n--- FazerCards API Request ---');
    console.log('URL:', url);
    console.log('Method: POST');
    console.log('Headers:', { ...headers, 'X-API-Key': '***HIDDEN***' });
    console.log('Body:', JSON.stringify(body, null, 2));
    console.log('------------------------------\n');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        timeout: 15000 // 15 seconds timeout
      });

      const responseData = await response.json().catch(() => null);

      console.log('\n--- FazerCards API Response ---');
      console.log('Status:', response.status);
      console.log('Body:', JSON.stringify(responseData, null, 2));
      console.log('-------------------------------\n');

      if (!response.ok) {
        throw new Error(responseData?.message || JSON.stringify(responseData) || `Provider API Error: ${response.status}`);
      }

      return {
        success: true,
        provider_order_id: responseData.order_id || responseData.id || `MOCK-${Date.now()}`,
        status: responseData.status || 'processing',
        raw_response: responseData
      };
    } catch (error) {
      console.error('FazerCards Provider Error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getOrders(page = 1, limit = 20) {
    if (!this.apiKey) {
      throw new Error('FazerCards API_KEY is not configured in the environment.');
    }

    const baseUrl = this.apiUrl.endsWith('/') ? this.apiUrl.slice(0, -1) : this.apiUrl;
    const urlPath = baseUrl.endsWith('/api/v2') ? `/orders?page=${page}&limit=${limit}` : `/api/v2/orders?page=${page}&limit=${limit}`;
    const url = `${baseUrl}${urlPath}`;

    const headers = {
      'Accept': 'application/json',
      'X-API-Key': this.apiKey
    };

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: headers,
        timeout: 10000
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(responseData?.message || `Provider API Error: ${response.status}`);
      }

      return {
        success: true,
        orders: responseData.orders || responseData.data || [],
        raw_response: responseData
      };
    } catch (error) {
      console.error('FazerCards Provider GetOrders Error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new FazerCardsProvider();
