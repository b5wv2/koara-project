const db = require('../config/db');
const topupCatalogService = require('./topupCatalogService');
const fazerCardsProvider = require('./providers/fazerCardsProvider');
const emailService = require('./emailService');

class TopupOrderService {
  async createOrder({ storeId, offerId, dynamicFields, customerInfo }) {
    const client = await db.pool.connect();
    let localOrderId = null;
    let deductedAmount = 0;
    
    try {
      await client.query('BEGIN');

      // 1. Fetch catalog details
      const offer = topupCatalogService.getOfferDetails(offerId);
      if (!offer) {
        throw new Error('Offer not found in catalog.');
      }
      
      const costPrice = parseFloat(offer.price_usd);
      if (isNaN(costPrice) || costPrice <= 0) {
        throw new Error('Invalid cost price for offer.');
      }

      // 2. Fetch merchant and product info
      const storeRes = await client.query('SELECT s.id, s.status, s.balance, s.store_name, u.email FROM stores s JOIN users u ON s.owner_id = u.id WHERE s.id = $1', [storeId]);
      if (storeRes.rows.length === 0) throw new Error('Store not found.');
      const store = storeRes.rows[0];
      if (store.status !== 'active') throw new Error('Store is not active.');

      const productRes = await client.query('SELECT selling_price, is_enabled FROM merchant_topup_products WHERE store_id = $1 AND offer_id = $2', [storeId, offerId]);
      if (productRes.rows.length === 0 || !productRes.rows[0].is_enabled) {
        throw new Error('This top-up product is not available or enabled in this store.');
      }
      const sellingPrice = parseFloat(productRes.rows[0].selling_price);

      // 3. Check wallet balance
      if (parseFloat(store.balance) < costPrice) {
        throw new Error('Insufficient Merchant Balance.');
      }

      // 4. Generate local order ID
      const seqRes = await client.query("SELECT nextval('order_number_seq')");
      localOrderId = `TOP-${String(seqRes.rows[0].nextval).padStart(8, '0')}`;

      // 5. Deduct merchant balance
      await client.query('UPDATE stores SET balance = balance - $1 WHERE id = $2', [costPrice, storeId]);
      deductedAmount = costPrice;

      // Log deduction in wallet transactions
      await client.query(`
        INSERT INTO wallet_transactions (store_id, amount, transaction_type, reason)
        VALUES ($1, $2, 'debit', $3)
      `, [storeId, costPrice, `Top-up Order ${localOrderId} Cost Deduction`]);

      // 6. Create order in processing status
      const merchantProfit = sellingPrice - costPrice;
      const orderInsert = await client.query(`
        INSERT INTO topup_orders (
          local_order_id, store_id, category_id, offer_id, dynamic_fields, 
          customer_name, customer_email, whatsapp, cost_price, selling_price, merchant_profit, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'processing'
        ) RETURNING id
      `, [
        localOrderId, storeId, 'free_fire_mena', offerId, JSON.stringify(dynamicFields),
        customerInfo.name, customerInfo.email, customerInfo.whatsapp, 
        costPrice, sellingPrice, merchantProfit
      ]);

      await client.query('COMMIT');
      
      // 7. Call FazerCards API
      const providerRes = await fazerCardsProvider.placeOrder('free_fire_mena', offerId, dynamicFields, localOrderId);

      if (providerRes.success) {
        // Success: update order
        await db.query(`
          UPDATE topup_orders 
          SET provider_order_id = $1, provider_response = $2, status = $3
          WHERE local_order_id = $4
        `, [providerRes.provider_order_id, JSON.stringify(providerRes.raw_response), providerRes.status, localOrderId]);

        return {
          success: true,
          orderId: localOrderId,
          status: providerRes.status
        };
      } else {
        // Failure: Trigger rollback flow
        await this.handleProviderFailure(storeId, store.email, store.store_name, localOrderId, offer.name, costPrice, providerRes.error);
        throw new Error('Provider failed to process the top-up order.');
      }

    } catch (error) {
      if (client) await client.query('ROLLBACK');
      console.error('Topup order process failed:', error.message);
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  async handleProviderFailure(storeId, storeEmail, storeName, localOrderId, productName, amount, errorMsg) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Update order status to failed
      await client.query(`
        UPDATE topup_orders 
        SET status = 'failed', provider_response = $1 
        WHERE local_order_id = $2
      `, [JSON.stringify({ error: errorMsg }), localOrderId]);

      // Refund the merchant
      const refundRes = await client.query(`
        UPDATE stores SET balance = balance + $1 WHERE id = $2 RETURNING balance
      `, [amount, storeId]);
      
      const newBalance = refundRes.rows[0].balance;

      // Log credit transaction
      await client.query(`
        INSERT INTO wallet_transactions (store_id, amount, transaction_type, reason)
        VALUES ($1, $2, 'credit', $3)
      `, [storeId, amount, `Refund for failed top-up order: ${localOrderId}`]);

      await client.query('COMMIT');

      // Send Refund Email
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
