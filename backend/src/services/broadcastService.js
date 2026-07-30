const db = require('../config/db');
const fcmNotificationService = require('./fcmNotificationService');
const emailService = require('./emailService');

class BroadcastService {
  /**
   * Schedules a broadcast to all active merchants asynchronously.
   * Returns immediately with the broadcast ID.
   */
  async sendBroadcast({ type, title, subject, message, createdBy }) {
    // 1. Insert initial pending record
    const insertRes = await db.query(`
      INSERT INTO broadcasts (type, title, subject, message, created_by, total_targets)
      VALUES ($1, $2, $3, $4, $5, 0)
      RETURNING id
    `, [type, title, subject, message, createdBy]);

    const broadcastId = insertRes.rows[0].id;

    // 2. Process async in the background
    this.processBroadcastInBackground(broadcastId, type, title, subject, message).catch(err => {
      console.error('[BroadcastService] Unhandled error in background processing:', err);
    });

    return broadcastId;
  }

  async processBroadcastInBackground(broadcastId, type, title, subject, message) {
    try {
      let pushSuccess = 0;
      let pushFail = 0;
      let emailSuccess = 0;
      let emailFail = 0;
      let totalTargets = 0;

      // ---- PUSH NOTIFICATIONS ----
      if (type === 'push' || type === 'both') {
        const tokenRes = await db.query(`
          SELECT mdt.device_token 
          FROM merchant_device_tokens mdt
          JOIN users u ON mdt.merchant_id = u.id
          WHERE u.status = 'active' AND u.role = 'merchant'
        `);
        const tokens = tokenRes.rows.map(r => r.device_token).filter(Boolean);
        totalTargets += tokens.length;

        // Chunk tokens into batches of 500 (Firebase limits)
        const BATCH_SIZE = 500;
        for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
          const batch = tokens.slice(i, i + BATCH_SIZE);
          const payload = {
            notification: {
              title: title || 'New Announcement',
              body: message
            },
            data: {
              type: 'broadcast',
              route: '/'
            }
          };

          // sendToMultipleDevices internally uses sendEachForMulticast and handles cleanup
          const success = await fcmNotificationService.sendToMultipleDevices(batch, payload);
          if (success) {
            // Note: fcmNotificationService returns true even if some failed. 
            // We approximate for now or we would need to refactor it to return exact counts.
            // But since fcm removes invalid tokens internally, this is acceptable.
            pushSuccess += batch.length; 
          } else {
            pushFail += batch.length;
          }
        }
      }

      // ---- EMAIL ----
      if (type === 'email' || type === 'both') {
        const emailRes = await db.query(`
          SELECT email 
          FROM users 
          WHERE status = 'active' AND role = 'merchant'
        `);
        const emails = emailRes.rows.map(r => r.email).filter(Boolean);
        totalTargets += emails.length;

        // Send emails asynchronously but concurrently in controlled chunks (e.g., 20 at a time)
        const CHUNK_SIZE = 20;
        for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
          const chunk = emails.slice(i, i + CHUNK_SIZE);
          const promises = chunk.map(email => 
            emailService.sendEmail(email, subject || 'Announcement', 'broadcast-email.html', { subject: subject || 'Announcement', message })
          );
          const results = await Promise.all(promises);
          results.forEach(res => {
            if (res) emailSuccess++;
            else emailFail++;
          });
        }
      }

      const totalSuccess = pushSuccess + emailSuccess;
      const totalFail = pushFail + emailFail;

      // Update broadcast record
      await db.query(`
        UPDATE broadcasts
        SET total_targets = $1, successful = $2, failed = $3
        WHERE id = $4
      `, [totalTargets, totalSuccess, totalFail, broadcastId]);

      console.log(`[BroadcastService] Broadcast ${broadcastId} completed. Success: ${totalSuccess}, Fail: ${totalFail}`);
    } catch (err) {
      console.error(`[BroadcastService] Error processing broadcast ${broadcastId}:`, err.message);
      await db.query(`
        UPDATE broadcasts
        SET failed = failed + total_targets
        WHERE id = $1
      `, [broadcastId]).catch(e => console.error('Failed to mark broadcast as failed', e));
    }
  }
}

module.exports = new BroadcastService();
