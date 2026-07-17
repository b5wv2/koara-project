const db = require('../config/db');
const notificationService = require('./notificationService');
const fazerCardsProvider = require('./providers/fazerCardsProvider');

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
   * Fetches orders for a specific store (strictly omitting encrypted_card_code for security)
   */
  async getStoreOrders(storeId) {
    const query = `
      SELECT 
        id, store_id, platform_product_id, merchant_product_id, order_number, 
        customer_name, customer_email, whatsapp, product_name, selling_price, cost_price, 
        currency_code, quantity, amount, total_amount, receipt_url, status, promo_code, 
        discount_amount, provider_id, provider_order_id, provider_name, provider_status, 
        completed_at, created_at, updated_at
      FROM orders 
      WHERE store_id = $1 
      ORDER BY created_at DESC
    `;
    console.log('[DEBUG-ORDER] Executing query for merchant orders (excluding sensitive PINs):', query);
    const res = await db.query(query, [storeId]);
    return res.rows;
  }

  /**
   * Approves a gift card / regular order with wallet balance deduction & provider dispatch.
   */
  async approveGiftCardOrder(orderId, storeId) {
    const client = await db.pool.connect();
    let order, mapping, store, costPrice = 0;

    try {
      await client.query('BEGIN');

      // 1. Fetch order & check status
      const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 AND store_id = $2 FOR UPDATE', [orderId, storeId]);
      if (orderRes.rows.length === 0) {
        throw new Error('Order not found or access denied.');
      }
      order = orderRes.rows[0];

      if (order.status !== 'pending') {
        throw new Error(`Order cannot be approved because it is currently in '${order.status}' status.`);
      }

      // 2. Check provider mapping if platform_product_id exists
      if (order.platform_product_id) {
        const mappingRes = await client.query(`
          SELECT 
            pp.*,
            p.name AS provider_name,
            p.id AS provider_id,
            COALESCE(pp.provider_category_id, pl.category) AS resolved_category_id
          FROM provider_products pp
          JOIN providers p ON pp.provider_id = p.id
          JOIN platform_products pl ON pp.product_id = pl.id
          WHERE pp.product_id = $1 AND pp.is_active = true
          ORDER BY pp.cost_price ASC
          LIMIT 1
        `, [order.platform_product_id]);

        if (mappingRes.rows.length > 0) {
          mapping = mappingRes.rows[0];
        }
      }

      // If no active provider mapping, complete as regular non-automated order
      if (!mapping) {
        const updateRes = await client.query(`
          UPDATE orders 
          SET status = 'processing', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND store_id = $2
          RETURNING *
        `, [orderId, storeId]);
        await client.query('COMMIT');
        return updateRes.rows[0];
      }

      // 3. Automated Provider Order: Deduct balance from store wallet
      const unitCost = parseFloat(mapping.cost_price || 0);
      costPrice = unitCost * (order.quantity || 1);

      const storeRes = await client.query('SELECT balance, store_name FROM stores WHERE id = $1 FOR UPDATE', [storeId]);
      store = storeRes.rows[0];

      if (parseFloat(store.balance) < costPrice) {
        throw new Error('Insufficient Merchant Balance.');
      }

      await client.query('UPDATE stores SET balance = balance - $1 WHERE id = $2', [costPrice, storeId]);

      await client.query(`
        INSERT INTO wallet_transactions (store_id, amount, transaction_type, reason)
        VALUES ($1, $2, 'debit', $3)
      `, [storeId, costPrice, `Gift Card Order ${order.order_number} Provider Cost Deduction`]);

      await client.query(`
        UPDATE orders 
        SET provider_id = $1, cost_price = $2
        WHERE id = $3
      `, [mapping.provider_id, costPrice, orderId]);

      await client.query('COMMIT');
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      client.release();
      throw error;
    }

    client.release();

    // 4. Dispatch to Provider (FazerCards)
    console.log(`[DEBUG-ORDER] Dispatching gift card order ${order.order_number} to provider ${mapping.provider_name}...`);
    const providerRes = await fazerCardsProvider.placeGiftCardOrder(
      mapping.resolved_category_id,
      mapping.provider_product_id,
      order.quantity || 1,
      order.order_number
    );

    if (providerRes.success) {
      const updateRes = await db.query(`
        UPDATE orders 
        SET provider_order_id = $1, provider_name = $2, provider_status = $3, status = 'processing', updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `, [providerRes.provider_order_id, mapping.provider_name, providerRes.status, orderId]);

      return updateRes.rows[0];
    } else {
      // 5. Provider dispatch failed: Rollback wallet deduction cleanly
      console.error(`[DEBUG-ORDER] Provider dispatch failed for order ${order.order_number}. Rolling back wallet deduction...`);
      const cleanupClient = await db.pool.connect();
      try {
        await cleanupClient.query('BEGIN');
        await cleanupClient.query('UPDATE stores SET balance = balance + $1 WHERE id = $2', [costPrice, storeId]);
        await cleanupClient.query(`
          INSERT INTO wallet_transactions (store_id, amount, transaction_type, reason)
          VALUES ($1, $2, 'credit', $3)
        `, [storeId, costPrice, `Refund due to provider failure for Order ${order.order_number}`]);
        const failRes = await cleanupClient.query(`
          UPDATE orders 
          SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
        `, [orderId]);
        await cleanupClient.query('COMMIT');
        throw new Error(`Provider failed to process the gift card order: ${providerRes.error || 'Unknown API error'}`);
      } catch (err) {
        if (cleanupClient) await cleanupClient.query('ROLLBACK');
        throw err;
      } finally {
        if (cleanupClient) cleanupClient.release();
      }
    }
  }

  /**
   * Rejects an order cleanly.
   */
  async rejectGiftCardOrder(orderId, storeId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 AND store_id = $2 FOR UPDATE', [orderId, storeId]);
      if (orderRes.rows.length === 0) {
        throw new Error('Order not found or access denied.');
      }
      const order = orderRes.rows[0];
      if (order.status !== 'pending') {
        throw new Error('Only pending orders can be rejected.');
      }

      const res = await client.query(`
        UPDATE orders 
        SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND store_id = $2
        RETURNING *
      `, [orderId, storeId]);

      await client.query('COMMIT');
      return res.rows[0];
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  /**
   * Updates an order status, delegating to automated approval/rejection flows when applicable.
   */
  async updateOrderStatus(orderId, storeId, status) {
    if (status === 'processing' || status === 'approved') {
      return await this.approveGiftCardOrder(orderId, storeId);
    }
    if (status === 'rejected') {
      return await this.rejectGiftCardOrder(orderId, storeId);
    }

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
