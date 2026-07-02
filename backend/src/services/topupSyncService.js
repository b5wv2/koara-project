const db = require('../config/db');
const fazerCardsProvider = require('./providers/fazerCardsProvider');
const emailService = require('./emailService');
const topupCatalogService = require('./topupCatalogService');

class TopupSyncService {
  constructor() {
    this.intervalId = null;
  }

  start() {
    console.log('Starting Top-up Background Sync Service...');
    // Run immediately, then every 10 minutes
    this.syncOrders();
    this.intervalId = setInterval(() => this.syncOrders(), 10 * 60 * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async syncOrders() {
    const client = await db.pool.connect();
    try {
      // 1. Find all local Top-up orders where status is pending_provider or processing
      const pendingOrdersRes = await client.query(`
        SELECT t.*, s.store_name, s.owner_id, u.email as store_email
        FROM topup_orders t
        JOIN stores s ON t.store_id = s.id
        JOIN users u ON s.owner_id = u.id
        WHERE t.status IN ('pending_provider', 'processing')
        AND t.provider_order_id IS NOT NULL
      `);
      
      const ordersToSync = pendingOrdersRes.rows;
      if (ordersToSync.length === 0) {
        return; // Nothing to sync
      }

      console.log(`[TopupSync] Found ${ordersToSync.length} orders to synchronize.`);

      // 2. Fetch orders from provider
      // Explicitly fetching page=1&limit=20 as per requirement
      const providerRes = await fazerCardsProvider.getOrders(1, 20); 

      if (!providerRes.success) {
        console.error('[TopupSync] Failed to fetch orders from provider:', providerRes.error);
        return;
      }

      const providerOrders = providerRes.orders;

      // 3. Match and Update
      for (const localOrder of ordersToSync) {
        const providerIdToMatch = String(localOrder.provider_order_id);
        const providerOrder = providerOrders.find(o => String(o.id) === providerIdToMatch || String(o.order_id) === providerIdToMatch);

        if (providerOrder) {
          const newStatus = providerOrder.status;

          // If status hasn't changed, just update sync time
          if (newStatus === localOrder.status) {
             await client.query(`
               UPDATE topup_orders 
               SET last_sync_time = NOW(), provider_response = $1
               WHERE id = $2
             `, [JSON.stringify(providerOrder), localOrder.id]);
             continue;
          }

          // Status changed!
          await client.query('BEGIN');

          await client.query(`
            UPDATE topup_orders 
            SET status = $1, last_sync_time = NOW(), provider_response = $2
            WHERE id = $3
          `, [newStatus, JSON.stringify(providerOrder), localOrder.id]);

          await client.query('COMMIT');

          console.log(`[TopupSync] Order ${localOrder.local_order_id} status changed from ${localOrder.status} to ${newStatus}`);

          // Trigger Notifications if completed
          if (newStatus === 'completed') {
            const offer = topupCatalogService.getOfferDetails(localOrder.offer_id);
            const offerName = offer ? offer.name : localOrder.offer_id;

            // Notify Customer
            emailService.sendEmail(localOrder.customer_email, 'Your Top-up Order Has Been Completed', 'topup-completed-customer.html', {
              customerName: localOrder.customer_name,
              orderId: localOrder.local_order_id
            });

            // Notify Merchant
            emailService.sendEmail(localOrder.store_email, 'Top-up Order Completed Successfully', 'topup-completed-merchant.html', {
              storeName: localOrder.store_name,
              orderId: localOrder.local_order_id,
              productName: offerName
            });
          }

        } else {
           // Order not found in this page of provider results
           // We'll just update last_sync_time so we know we checked
           await client.query(`UPDATE topup_orders SET last_sync_time = NOW() WHERE id = $1`, [localOrder.id]);
        }
      }

    } catch (error) {
      console.error('[TopupSync] Error during synchronization:', error);
    } finally {
      client.release();
    }
  }
}

module.exports = new TopupSyncService();
