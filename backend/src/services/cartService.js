const orderService = require('./orderService');
const topupOrderService = require('./topupOrderService');

class CartService {
  /**
   * Processes a multi-item shopping cart checkout.
   * Uploads ONE receipt file and generates separate, independent orders in the database for each item.
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

    const checkoutGroupId = `KOA-GRP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const createdOrders = [];

    for (const item of cartItems) {
      const quantity = item.quantity || 1;
      
      // Determine if item is Top-Up or Platform Product
      if (item.isTopup || item.offerId) {
        // Create topup order for each quantity or single item
        for (let i = 0; i < quantity; i++) {
          const topupOrder = await topupOrderService.createPendingOrder({
            storeId,
            offerId: item.offerId || item.id,
            dynamicFields: item.dynamicFields || {},
            customerInfo: { name: customerName, email: customerEmail, whatsapp },
            receiptUrl,
            promoCode,
            checkoutGroupId
          });
          createdOrders.push({
            id: topupOrder.orderId,
            orderNumber: topupOrder.orderId,
            type: 'topup',
            productName: item.name || 'Top-Up Product'
          });
        }
      } else {
        // Platform Product Order
        const platformOrder = await orderService.createOrder({
          storeId,
          customerName,
          customerEmail,
          whatsapp,
          platformProductId: item.platformProductId || item.id,
          quantity,
          receiptUrl,
          promoCode,
          checkoutGroupId
        });
        createdOrders.push({
          id: platformOrder.id,
          orderNumber: platformOrder.order_number,
          type: 'platform',
          productName: platformOrder.product_name
        });
      }
    }

    return {
      success: true,
      checkoutGroupId,
      orders: createdOrders
    };
  }
}

module.exports = new CartService();
