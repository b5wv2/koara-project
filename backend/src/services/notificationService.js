const emailService = require('./emailService');
const db = require('../config/db');

class NotificationService {
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
      return false; // Do not throw to avoid breaking business workflows
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
      // orderDetails contains: customer_name, order_number, store_name, product_name, quantity, total_amount, currency, creation_date
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
}

module.exports = new NotificationService();
