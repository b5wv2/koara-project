const admin = require('firebase-admin');
const db = require('../config/db');

class NotificationService {
  constructor() {
    this.initialized = false;
    this.initFirebase();
  }

  initFirebase() {
    try {
      if (!admin.apps || admin.apps.length === 0) {
        // Option 1: Using FIREBASE_SERVICE_ACCOUNT base64 encoded JSON from env
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
          const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'));
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });
          this.initialized = true;
          console.log('[NotificationService] Firebase initialized successfully from base64 env.');
        } 
        // Option 2: Using GOOGLE_APPLICATION_CREDENTIALS path from env (Firebase default behavior if initialized without args)
        else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          admin.initializeApp();
          this.initialized = true;
          console.log('[NotificationService] Firebase initialized successfully from credentials path.');
        } else {
          console.warn('[NotificationService] Firebase credentials not provided. Push notifications are disabled.');
        }
      } else {
         this.initialized = true;
      }
    } catch (error) {
      console.error('[NotificationService] Failed to initialize Firebase:', error.message);
    }
  }

  /**
   * Register a device token for a merchant
   * @param {number} merchantId 
   * @param {string} deviceToken 
   * @param {string} platform - 'android' or 'ios'
   */
  async registerDeviceToken(merchantId, deviceToken, platform) {
    try {
      // Upsert: if device token exists, update merchant_id and platform
      const query = `
        INSERT INTO merchant_device_tokens (merchant_id, device_token, platform, created_at, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (device_token) 
        DO UPDATE SET 
          merchant_id = EXCLUDED.merchant_id,
          platform = EXCLUDED.platform,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;
      const result = await db.query(query, [merchantId, deviceToken, platform]);
      console.log(`[NotificationService] Registered device token for merchant ${merchantId}`);
      return result.rows[0];
    } catch (error) {
      console.error('[NotificationService] Failed to register device token:', error.message);
      throw error;
    }
  }

  /**
   * Remove invalid device token from database
   * @param {string} deviceToken 
   */
  async removeInvalidToken(deviceToken) {
    try {
      await db.query('DELETE FROM merchant_device_tokens WHERE device_token = $1', [deviceToken]);
      console.log(`[NotificationService] Removed invalid device token: ${deviceToken.substring(0, 10)}...`);
    } catch (error) {
      console.error('[NotificationService] Error removing invalid token:', error.message);
    }
  }

  /**
   * Handle Firebase specific errors
   * @param {Error} error 
   * @param {string} deviceToken 
   */
  async handleFirebaseError(error, deviceToken) {
    const errorCodesToRemove = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
      'messaging/invalid-argument'
    ];

    if (error.code && errorCodesToRemove.includes(error.code)) {
      await this.removeInvalidToken(deviceToken);
    } else {
      console.error(`[NotificationService] Firebase messaging error: ${error.message}`);
    }
  }

  /**
   * Send a notification to a single device
   * @param {string} deviceToken 
   * @param {Object} payload 
   */
  async sendNotification(deviceToken, payload) {
    if (!this.initialized) {
      console.log('[NotificationService] Firebase not initialized. Skipping notification to', deviceToken);
      return false;
    }

    try {
      const message = {
        token: deviceToken,
        ...payload
      };

      const response = await admin.messaging().send(message);
      console.log(`[NotificationService] Successfully sent message: ${response}`);
      return true;
    } catch (error) {
      await this.handleFirebaseError(error, deviceToken);
      return false;
    }
  }

  /**
   * Send a notification to multiple devices
   * @param {string[]} deviceTokens 
   * @param {Object} payload 
   */
  async sendToMultipleDevices(deviceTokens, payload) {
    if (!this.initialized) {
      console.log('[NotificationService] Firebase not initialized. Skipping multicast notification.');
      return false;
    }

    if (!deviceTokens || deviceTokens.length === 0) return false;

    try {
      const message = {
        tokens: deviceTokens,
        ...payload
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`[NotificationService] Multicast complete: ${response.successCount} success, ${response.failureCount} failures.`);

      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push({
              token: deviceTokens[idx],
              error: resp.error
            });
          }
        });

        // Process failures asynchronously
        failedTokens.forEach(({ token, error }) => {
          this.handleFirebaseError(error, token);
        });
      }

      return true;
    } catch (error) {
      console.error('[NotificationService] Failed to send multicast message:', error.message);
      return false;
    }
  }

  /**
   * Fetch all tokens for a merchant and send notification
   * @param {number} merchantId 
   * @param {Object} payload 
   */
  async sendToMerchant(merchantId, payload) {
    try {
      const result = await db.query('SELECT device_token FROM merchant_device_tokens WHERE merchant_id = $1', [merchantId]);
      
      if (result.rows.length === 0) {
        console.log(`[NotificationService] No device tokens found for merchant ${merchantId}.`);
        return false;
      }

      const tokens = result.rows.map(row => row.device_token);
      return await this.sendToMultipleDevices(tokens, payload);
    } catch (error) {
      console.error(`[NotificationService] Error sending to merchant ${merchantId}:`, error.message);
      return false;
    }
  }
}

module.exports = new NotificationService();
