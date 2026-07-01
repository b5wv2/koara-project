

class FazerCardsProvider {
  constructor() {
    this.apiKey = process.env.API_KEY;
    this.apiUrl = process.env.FAZERCARDS_API_URL || 'https://api.fazercards.com';
  }

  async placeOrder(categoryId, offerId, fields, idempotencyKey) {
    if (!this.apiKey) {
      throw new Error('FazerCards API_KEY is not configured in the environment.');
    }

    const url = `${this.apiUrl}/api/v2/topups/order`;
    const body = {
      category_id: categoryId,
      offer_id: offerId,
      fields: fields
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-API-Key': this.apiKey,
          'Idempotency-Key': idempotencyKey || Date.now().toString()
        },
        body: JSON.stringify(body),
        timeout: 15000 // 15 seconds timeout
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(responseData?.message || `Provider API Error: ${response.status}`);
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
}

module.exports = new FazerCardsProvider();
