const emailService = require('./emailService');
const db = require('../config/db');

class NotificationService {
  /**
   * Log notification attempt to database for delivery audit
   */
  async logNotification(recipient, type, channel, success, failureReason) {
    try {
      await db.query(
        `INSERT INTO notification_logs (recipient, type, channel, success, failure_reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [recipient, type, channel, success, failureReason]
      );
    } catch (error) {
      console.error('Failed to log notification attempt to database:', error.message);
    }
  }

  async sendStoreApproved(email, storeName, storeUrl) {
    try {
      const data = {
        store_name: storeName,
        store_url: storeUrl
      };
      
      const success = await emailService.sendEmail(
        email, 
        'Your Koara Store Application is Approved!', 
        'store-approved.html', 
        data
      );

      await this.logNotification(email, 'Store Approval', 'email', success, success ? null : 'Email service returned false');
      return success;
    } catch (error) {
      console.error('Error sending Store Approval notification:', error);
      await this.logNotification(email, 'Store Approval', 'email', false, error.message);
      return false;
    }
  }

  async sendStoreRejected(email, storeName, rejectionReason) {
    try {
      const data = {
        store_name: storeName,
        rejection_reason: rejectionReason || 'No specific reason provided.'
      };
      
      const success = await emailService.sendEmail(
        email, 
        'Update on your Koara Store Application', 
        'store-rejected.html', 
        data
      );

      await this.logNotification(email, 'Store Rejection', 'email', success, success ? null : 'Email service returned false');
      return success;
    } catch (error) {
      console.error('Error sending Store Rejection notification:', error);
      await this.logNotification(email, 'Store Rejection', 'email', false, error.message);
      return false;
    }
  }

  async sendOrderConfirmation(customerEmail, orderDetails) {
    try {
      const data = {
        customer_name: orderDetails.customer_name,
        order_number: orderDetails.order_number,
        store_name: orderDetails.store_name,
        product_name: orderDetails.product_name,
        quantity: orderDetails.quantity,
        total_amount: parseFloat(orderDetails.total_amount).toFixed(2),
        currency: orderDetails.currency_code || 'USD',
        creation_date: new Date().toLocaleDateString()
      };
      
      const success = await emailService.sendEmail(
        customerEmail, 
        `Order Confirmation - ${orderDetails.order_number}`, 
        'order-confirmation.html', 
        data
      );

      await this.logNotification(customerEmail, 'Order Confirmation', 'email', success, success ? null : 'Email service returned false');
      return success;
    } catch (error) {
      console.error('Error sending Order Confirmation notification:', error);
      await this.logNotification(customerEmail, 'Order Confirmation', 'email', false, error.message);
      return false;
    }
  }

  /**
   * Sends a single consolidated email to customer for a cart checkout.
   */
  async sendCartCheckoutCustomerNotification({
    customerEmail,
    customerName,
    storeName,
    totalAmount,
    orders
  }) {
    try {
      const ordersRowsHtml = orders.map(ord => `
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #edf2f7;">
            <span class="order-num" style="font-family: monospace; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 2px 6px; border-radius: 4px;">${ord.orderNumber}</span>
          </td>
          <td style="padding: 10px 0; border-top: 1px solid #edf2f7; font-weight: 600;">
            ${ord.productName}
            ${ord.details ? `<br><span style="font-size: 11px; color: #64748b; font-weight: normal;">${ord.details}</span>` : ''}
          </td>
          <td style="padding: 10px 0; border-top: 1px solid #edf2f7;">
            <span class="order-status" style="display: inline-block; font-size: 11px; font-weight: 700; color: #d97706; background: #fef3c7; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase;">Pending</span>
          </td>
        </tr>
      `).join('');

      const data = {
        store_name: storeName || 'Koara Store',
        customer_name: customerName || 'Valued Customer',
        order_count: orders.length,
        total_amount: parseFloat(totalAmount).toFixed(2),
        orders_rows: ordersRowsHtml
      };

      const success = await emailService.sendEmail(
        customerEmail,
        `Checkout Confirmation - ${storeName || 'Koara Store'} (${orders.length} items)`,
        'cart-checkout-customer.html',
        data
      );

      await this.logNotification(customerEmail, 'Cart Checkout Customer Summary', 'email', success, success ? null : 'Email service returned false');
      return success;
    } catch (error) {
      console.error('Error sending Cart Checkout Customer Notification:', error);
      await this.logNotification(customerEmail, 'Cart Checkout Customer Summary', 'email', false, error.message);
      return false;
    }
  }

  /**
   * Sends a single consolidated email to merchant for a cart checkout.
   */
  async sendCartCheckoutMerchantNotification({
    merchantEmail,
    storeName,
    customerName,
    customerEmail,
    whatsapp,
    totalAmount,
    orders
  }) {
    try {
      const ordersRowsHtml = orders.map(ord => `
        <tr>
          <td style="padding: 10px 0; border-top: 1px solid #edf2f7;">
            <span class="order-num" style="font-family: monospace; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 2px 6px; border-radius: 4px;">${ord.orderNumber}</span>
          </td>
          <td style="padding: 10px 0; border-top: 1px solid #edf2f7; font-weight: 600;">
            ${ord.productName}
            ${ord.details ? `<br><span style="font-size: 11px; color: #64748b; font-weight: normal;">${ord.details}</span>` : ''}
          </td>
          <td style="padding: 10px 0; border-top: 1px solid #edf2f7; font-family: monospace; font-weight: bold;">
            $${parseFloat(ord.price || 0).toFixed(2)}
          </td>
        </tr>
      `).join('');

      const data = {
        store_name: storeName || 'Koara Store',
        customer_name: customerName || 'Customer',
        customer_email: customerEmail,
        whatsapp: whatsapp || 'N/A',
        order_count: orders.length,
        total_amount: parseFloat(totalAmount).toFixed(2),
        orders_rows: ordersRowsHtml
      };

      const success = await emailService.sendEmail(
        merchantEmail,
        `New Cart Orders Received (${orders.length} items) - ${storeName}`,
        'cart-checkout-merchant.html',
        data
      );

      await this.logNotification(merchantEmail, 'Cart Checkout Merchant Summary', 'email', success, success ? null : 'Email service returned false');
      return success;
    } catch (error) {
      console.error('Error sending Cart Checkout Merchant Notification:', error);
      await this.logNotification(merchantEmail, 'Cart Checkout Merchant Summary', 'email', false, error.message);
      return false;
    }
  }

  /**
   * Consolidated batch notification handler for Shopping Cart checkout.
   * Groups orders by merchant (future-proofed for multi-merchant carts) and dispatches exactly 1 customer email + 1 email per merchant.
   */
  async notifyCartCheckout({
    customerName,
    customerEmail,
    whatsapp,
    totalAmount,
    orders,
    storeName
  }) {
    if (!orders || orders.length === 0) return;

    // 1. Dispatch ONE Customer Email
    await this.sendCartCheckoutCustomerNotification({
      customerEmail,
      customerName,
      storeName: storeName || (orders[0] && orders[0].storeName) || 'Koara Store',
      totalAmount,
      orders
    });

    // 2. Partition orders by merchant / store for Future Multi-Merchant Support
    const ordersByMerchant = {};
    orders.forEach(ord => {
      const key = ord.merchantEmail || ord.storeId || 'default';
      if (!ordersByMerchant[key]) {
        ordersByMerchant[key] = {
          merchantEmail: ord.merchantEmail,
          storeName: ord.storeName || storeName,
          orders: [],
          totalAmount: 0
        };
      }
      ordersByMerchant[key].orders.push(ord);
      ordersByMerchant[key].totalAmount += parseFloat(ord.price || 0);
    });

    // 3. Dispatch ONE Email Per Merchant
    for (const key of Object.keys(ordersByMerchant)) {
      const merchantGroup = ordersByMerchant[key];
      if (merchantGroup.merchantEmail) {
        await this.sendCartCheckoutMerchantNotification({
          merchantEmail: merchantGroup.merchantEmail,
          storeName: merchantGroup.storeName,
          customerName,
          customerEmail,
          whatsapp,
          totalAmount: merchantGroup.totalAmount,
          orders: merchantGroup.orders
        });
      }
    }
  }
}

module.exports = new NotificationService();
