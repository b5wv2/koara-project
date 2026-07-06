const db = require('../config/db');
const topupCatalogService = require('./topupCatalogService');
const fazerCardsProvider = require('./providers/fazerCardsProvider');
const emailService = require('./emailService');

class TopupOrderService {
  async createPendingOrder({ storeId, offerId, dynamicFields, customerInfo, receiptUrl }) {
    const client = await db.pool.connect();
    let localOrderId = null;
    
    try {
      await client.query('BEGIN');

      // 1. Fetch catalog details
      const offer = topupCatalogService.getOfferDetails(offerId);
      if (!offer) {
        throw new Error('Offer not found in catalog.');
      }
      
      const costPrice = parseFloat(offer.price_usd);
      if (isNaN(costPrice) || costPrice <= 0) {
        throw new Error('Invalid provider cost price for offer.');
      }

      // 2. Fetch merchant and product info
      const storeRes = await client.query('SELECT s.id, s.status, s.store_name, u.email FROM stores s JOIN users u ON s.owner_id = u.id WHERE s.id = $1', [storeId]);
      if (storeRes.rows.length === 0) throw new Error('Store not found.');
      const store = storeRes.rows[0];
      if (store.status !== 'active') throw new Error('Store is not active.');

      const productRes = await client.query('SELECT selling_price, admin_cost_price, is_enabled FROM merchant_topup_products WHERE store_id = $1 AND offer_id = $2', [storeId, offerId]);
      if (productRes.rows.length === 0 || !productRes.rows[0].is_enabled) {
        throw new Error('This top-up product is not available or enabled in this store.');
      }
      const sellingPrice = parseFloat(productRes.rows[0].selling_price);
      // Default to costPrice if admin_cost_price is null
      const adminCostPrice = productRes.rows[0].admin_cost_price !== null ? parseFloat(productRes.rows[0].admin_cost_price) : costPrice;

      // 3. Generate local order ID with KOA- prefix
      const seqRes = await client.query("SELECT nextval('order_number_seq')");
      localOrderId = `KOA-${String(seqRes.rows[0].nextval).padStart(8, '0')}`;

      // 4. Create order in pending status
      const merchantProfit = sellingPrice - adminCostPrice;
      await client.query(`
        INSERT INTO topup_orders (
          local_order_id, store_id, category_id, offer_id, dynamic_fields, 
          customer_name, customer_email, whatsapp, cost_price, admin_cost_price, selling_price, merchant_profit, status, receipt_url
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13
        )
      `, [
        localOrderId, storeId, 'free_fire_mena', offerId, JSON.stringify(dynamicFields),
        customerInfo.name, customerInfo.email, customerInfo.whatsapp, 
        costPrice, adminCostPrice, sellingPrice, merchantProfit, receiptUrl
      ]);

      await client.query('COMMIT');
      
      // 5. Send Pending Emails
      // Send to customer
      emailService.sendEmail(customerInfo.email, 'Order Received - Pending Approval', 'topup-pending-customer.html', {
        customerName: customerInfo.name,
        orderId: localOrderId,
        productName: offer.name
      });

      // Send to merchant
      emailService.sendEmail(store.email, 'New Order Received', 'topup-pending-merchant.html', {
        storeName: store.store_name,
        orderId: localOrderId,
        productName: offer.name
      });

      return {
        success: true,
        orderId: localOrderId,
        status: 'pending'
      };

    } catch (error) {
      if (client) await client.query('ROLLBACK');
      console.error('Topup createPendingOrder failed:', error.message);
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  async approveOrder(orderId, storeId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch order & store by numeric ID
      const orderRes = await client.query('SELECT * FROM topup_orders WHERE id = $1 AND store_id = $2 FOR UPDATE', [orderId, storeId]);
      if (orderRes.rows.length === 0) throw new Error('Order not found.');
      const order = orderRes.rows[0];
      const localOrderId = order.local_order_id;

      if (order.status !== 'pending') {
        throw new Error(`Order cannot be approved because it is currently in '${order.status}' status.`);
      }

      const storeRes = await client.query('SELECT balance, store_name, u.email FROM stores s JOIN users u ON s.owner_id = u.id WHERE s.id = $1 FOR UPDATE', [storeId]);
      const store = storeRes.rows[0];

      const adminCostPrice = parseFloat(order.admin_cost_price);
      
      // 2. Check wallet balance
      if (parseFloat(store.balance) < adminCostPrice) {
        throw new Error('Insufficient Merchant Balance.');
      }

      // 3. Deduct wallet
      await client.query('UPDATE stores SET balance = balance - $1 WHERE id = $2', [adminCostPrice, storeId]);

      // 4. Log transaction
      await client.query(`
        INSERT INTO wallet_transactions (store_id, amount, transaction_type, reason)
        VALUES ($1, $2, 'debit', $3)
      `, [storeId, adminCostPrice, `Top-up Order ${localOrderId} Admin Cost Deduction`]);

      await client.query('COMMIT');

      // 5. Call Provider
      const providerRes = await fazerCardsProvider.placeOrder(order.category_id, order.offer_id, order.dynamic_fields, localOrderId);

      if (providerRes.success) {
        await db.query(`
          UPDATE topup_orders 
          SET provider_order_id = $1, provider_response = $2, status = $3
          WHERE id = $4
        `, [providerRes.provider_order_id, JSON.stringify(providerRes.raw_response), providerRes.status, orderId]);

        return { success: true, orderId: localOrderId, status: providerRes.status };
      } else {
        // Rollback
        const offer = topupCatalogService.getOfferDetails(order.offer_id);
        const offerName = offer ? offer.name : order.offer_id;
        await this.handleProviderFailure(storeId, store.email, store.store_name, orderId, localOrderId, offerName, adminCostPrice, providerRes.error);
        throw new Error('Provider failed to process the top-up order.');
      }
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  async rejectOrder(orderId, storeId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const orderRes = await client.query('SELECT * FROM topup_orders WHERE id = $1 AND store_id = $2 FOR UPDATE', [orderId, storeId]);
      if (orderRes.rows.length === 0) throw new Error('Order not found.');
      const order = orderRes.rows[0];
      const localOrderId = order.local_order_id;

      if (order.status !== 'pending') {
        throw new Error('Only pending orders can be rejected.');
      }

      await client.query("UPDATE topup_orders SET status = 'rejected' WHERE id = $1", [orderId]);
      await client.query('COMMIT');

      // Send rejection email to customer
      const offer = topupCatalogService.getOfferDetails(order.offer_id);
      const offerName = offer ? offer.name : order.offer_id;

      emailService.sendEmail(order.customer_email, 'Your Order has been Rejected', 'topup-rejected-customer.html', {
        customerName: order.customer_name,
        orderId: localOrderId,
        productName: offerName
      });

      return { success: true, orderId: localOrderId, status: 'rejected' };
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  async handleProviderFailure(storeId, storeEmail, storeName, orderId, localOrderId, productName, amount, errorMsg) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("UPDATE topup_orders SET status = 'rejected', provider_response = $1 WHERE id = $2", [JSON.stringify({ error: errorMsg }), orderId]);
      const refundRes = await client.query('UPDATE stores SET balance = balance + $1 WHERE id = $2 RETURNING balance', [amount, storeId]);
      const newBalance = refundRes.rows[0].balance;

      await client.query("INSERT INTO wallet_transactions (store_id, amount, transaction_type, reason) VALUES ($1, $2, 'credit', $3)", [storeId, amount, `Refund for failed top-up order: ${localOrderId}`]);
      await client.query('COMMIT');

      emailService.sendEmail(storeEmail, 'Merchant Balance Refunded', 'topup-refund-email.html', {
        storeName: storeName,
        orderId: localOrderId,
        productName: productName,
        amount: parseFloat(amount).toFixed(2),
        reason: errorMsg || 'Unknown Provider Error',
        newBalance: parseFloat(newBalance).toFixed(2)
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('CRITICAL: Failed to process refund for top-up failure!', err.message);
    } finally {
      client.release();
    }
  }
}

module.exports = new TopupOrderService();
