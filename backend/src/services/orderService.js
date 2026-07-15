const db = require('../config/db');
const notificationService = require('./notificationService');

class OrderService {
  /**
   * Creates a new order using an atomic transaction.
   */
  async createOrder({
    storeId,
    customerName,
    customerEmail,
    whatsapp,
    platformProductId,
    quantity = 1,
    receiptUrl,
    promoCode = null
  }) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Validate merchant and store
      const storeRes = await client.query('SELECT id, status, store_name FROM stores WHERE id = $1', [storeId]);
      if (storeRes.rows.length === 0) {
        throw new Error('Store not found.');
      }
      if (storeRes.rows[0].status !== 'active') {
        throw new Error('Store is not active.');
      }

      // 2. Validate product and fetch historical snapshot data
      const productRes = await client.query(`
        SELECT 
          mp.id AS merchant_product_id,
          mp.selling_price,
          pp.name AS product_name
        FROM merchant_products mp
        JOIN platform_products pp ON mp.catalog_product_id = pp.id
        WHERE mp.store_id = $1 AND mp.catalog_product_id = $2 AND mp.is_enabled = true
      `, [storeId, platformProductId]);

      if (productRes.rows.length === 0) {
        throw new Error('Product not available in this store.');
      }

      const product = productRes.rows[0];
      const sellingPrice = parseFloat(product.selling_price);
      let totalAmount = sellingPrice * quantity;
      
      // 3. Process Promo Code
      let discountAmount = 0;
      let appliedPromoCode = null;

      if (promoCode) {
        const promoRes = await client.query(`
          SELECT * FROM promos 
          WHERE store_id = $1 AND code = $2 AND status = 'active' FOR UPDATE
        `, [storeId, promoCode]);

        if (promoRes.rows.length === 0) {
          throw new Error('Invalid or inactive promo code.');
        }

        const promo = promoRes.rows[0];

        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
          throw new Error('Promo code has expired.');
        }

        if (promo.usage_limit !== null && promo.used_count >= promo.usage_limit) {
          throw new Error('Promo code usage limit exceeded.');
        }

        if (promo.discount_type === 'percentage') {
          discountAmount = totalAmount * (parseFloat(promo.value) / 100);
        } else if (promo.discount_type === 'fixed') {
          discountAmount = parseFloat(promo.value);
        }
        
        if (discountAmount > totalAmount) {
          discountAmount = totalAmount;
        }

        appliedPromoCode = promo.code;
        totalAmount -= discountAmount;

        await client.query(`
          UPDATE promos 
          SET used_count = used_count + 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [promo.id]);
      }

      // We assume USD for now based on legacy logic, but we could fetch from store settings
      const currencyCode = 'USD';

      // 4. Generate sequential order number
      const seqRes = await client.query("SELECT nextval('order_number_seq')");
      const seqNum = seqRes.rows[0].nextval;
      const orderNumber = `KOA-${String(seqNum).padStart(8, '0')}`;

      // 5. Insert order
      const insertRes = await client.query(`
        INSERT INTO orders (
          store_id, 
          platform_product_id, 
          merchant_product_id, 
          order_number, 
          customer_name, 
          customer_email, 
          whatsapp, 
          product_name,
          selling_price,
          currency_code,
          quantity,
          amount,
          total_amount,
          receipt_url,
          status,
          promo_code,
          discount_amount
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending', $15, $16
        ) RETURNING *
      `, [
        storeId,
        platformProductId,
        product.merchant_product_id,
        orderNumber,
        customerName,
        customerEmail,
        whatsapp,
        product.product_name,
        sellingPrice,
        currencyCode,
        quantity,
        totalAmount, // amount is the legacy column
        totalAmount,
        receiptUrl,
        appliedPromoCode,
        discountAmount
      ]);

      await client.query('COMMIT');
      
      const newOrder = insertRes.rows[0];
      console.log('[DEBUG-ORDER] Order created successfully:', newOrder);
      console.log('[DEBUG-ORDER] Relationships:', {
        store_id: newOrder.store_id,
        merchant_product_id: newOrder.merchant_product_id,
        platform_product_id: newOrder.platform_product_id
      });
      
      // Trigger notification
      await notificationService.sendOrderConfirmation(customerEmail, {
        ...newOrder,
        store_name: storeRes.rows[0].store_name
      });
      
      return newOrder;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Order creation transaction failed:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Fetches orders for a specific store
   */
  async getStoreOrders(storeId) {
    const query = `
      SELECT * FROM orders 
      WHERE store_id = $1 
      ORDER BY created_at DESC
    `;
    console.log('[DEBUG-ORDER] Executing query for merchant orders:', query);
    console.log('[DEBUG-ORDER] Query params:', [storeId]);
    const res = await db.query(query, [storeId]);
    console.log('[DEBUG-ORDER] Number of rows returned:', res.rows.length);
    return res.rows;
  }

  /**
   * Updates an order status (without deducting wallet balance as per rules)
   */
  async updateOrderStatus(orderId, storeId, status) {
    const res = await db.query(`
      UPDATE orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND store_id = $3
      RETURNING *
    `, [status, orderId, storeId]);
    
    if (res.rows.length === 0) {
      throw new Error('Order not found or access denied.');
    }
    
    return res.rows[0];
  }
}

module.exports = new OrderService();
