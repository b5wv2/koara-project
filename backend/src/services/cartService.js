const db = require('../config/db');
const orderService = require('./orderService');
const topupOrderService = require('./topupOrderService');
const notificationService = require('./notificationService');
const fcmNotificationService = require('./fcmNotificationService');

class CartService {
  /**
   * Processes a multi-item shopping cart checkout.
   * Uploads ONE receipt file and generates separate, independent orders in the database for each item.
   * Dispatches consolidated notifications (1 customer email + 1 email per merchant).
   */
  async processCartCheckout({
    storeId,
    customerName,
    customerEmail,
    whatsapp,
    cartItems,
    receiptUrl,
    promoCode = null
  }) {
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      throw new Error('Shopping cart is empty.');
    }

    // 1. Fetch store and merchant info for batch notifications
    const storeRes = await db.query(
      'SELECT s.id, s.store_name, u.email AS merchant_email FROM stores s JOIN users u ON s.owner_id = u.id WHERE s.id = $1',
      [storeId]
    );
    const storeName = storeRes.rows.length > 0 ? storeRes.rows[0].store_name : 'Koara Store';
    const merchantEmail = storeRes.rows.length > 0 ? storeRes.rows[0].merchant_email : null;

    const checkoutGroupId = `KOA-GRP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const createdOrders = [];
    let totalCartAmount = 0;

    for (const item of cartItems) {
      const quantity = item.quantity || 1;
      const isTopup = !!item.isTopup || !!item.offerId;
      
      // Top-Up Product Order
      if (isTopup) {
        for (let i = 0; i < quantity; i++) {
          const topupOrder = await topupOrderService.createPendingOrder({
            storeId,
            offerId: item.offerId || item.id,
            dynamicFields: item.dynamicFields || {},
            customerInfo: { name: customerName, email: customerEmail, whatsapp },
            receiptUrl,
            promoCode,
            checkoutGroupId,
            skipNotifications: true // Suppress individual emails
          });

          const itemPrice = parseFloat(topupOrder.sellingPrice || item.selling_price || 0);
          totalCartAmount += itemPrice;

          const detailsStr = item.dynamicFields && Object.keys(item.dynamicFields).length > 0
            ? Object.entries(item.dynamicFields).map(([k, v]) => `${k.replace('_', ' ')}: ${v}`).join(' | ')
            : null;

          createdOrders.push({
            id: topupOrder.orderId,
            orderNumber: topupOrder.orderId,
            type: 'topup',
            productName: topupOrder.productName || item.name || 'Top-Up Product',
            price: itemPrice,
            quantity: 1,
            details: detailsStr,
            storeId: topupOrder.storeId || storeId,
            storeName: topupOrder.storeName || storeName,
            merchantEmail: topupOrder.merchantEmail || merchantEmail
          });
        }
      } else {
        // Platform Product / Gift Card Order
        const platformOrder = await orderService.createOrder({
          storeId,
          customerName,
          customerEmail,
          whatsapp,
          platformProductId: item.platformProductId || item.id,
          quantity,
          receiptUrl,
          promoCode,
          checkoutGroupId,
          skipNotifications: true // Suppress individual emails
        });

        const itemPrice = parseFloat(platformOrder.total_amount || (item.selling_price * quantity) || 0);
        totalCartAmount += itemPrice;

        createdOrders.push({
          id: platformOrder.id,
          orderNumber: platformOrder.order_number,
          type: 'platform',
          productName: platformOrder.product_name || item.name || 'Gift Card',
          price: itemPrice,
          quantity,
          details: `Qty: ${quantity}`,
          storeId,
          storeName,
          merchantEmail
        });
      }
    }

    // 2. Dispatch Consolidated Notifications (1 Customer Email + 1 Email Per Merchant)
    try {
      await notificationService.notifyCartCheckout({
        customerName,
        customerEmail,
        whatsapp,
        totalAmount: totalCartAmount,
        orders: createdOrders,
        storeName
      });
    } catch (notifError) {
      console.error('[CART-CHECKOUT] Non-blocking error dispatching batch notifications:', notifError);
    }

    // 3. Dispatch Push Notification via FCM
    try {
      const storeOwnerRes = await db.query('SELECT owner_id FROM stores WHERE id = $1', [storeId]);
      if (storeOwnerRes.rows.length > 0) {
        const merchantOwnerId = storeOwnerRes.rows[0].owner_id;
        console.log(`[CART-CHECKOUT] Preparing FCM notification. storeId: ${storeId}, merchantOwnerId (resolved): ${merchantOwnerId}`);
        fcmNotificationService.sendToMerchant(merchantOwnerId, {
          notification: {
            title: 'New Order',
            body: 'You have received a new order.'
          },
          data: {
            type: 'order',
            route: '/orders'
          }
        }).catch(err => console.error('[CART-CHECKOUT] Async FCM Error:', err.message));
      } else {
        console.log(`[CART-CHECKOUT] No owner found for storeId: ${storeId}`);
      }
    } catch (fcmErr) {
      console.error('[CART-CHECKOUT] Non-blocking error dispatching FCM notification:', fcmErr);
    }

    return {
      success: true,
      checkoutGroupId,
      orders: createdOrders
    };
  }
}

module.exports = new CartService();
