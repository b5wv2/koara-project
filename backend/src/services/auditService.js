const db = require('../config/db');

/**
 * Log an audit event
 * @param {string} email 
 * @param {string} action - OTP_GENERATED, OTP_RESENT, OTP_VERIFIED, OTP_EXPIRED, OTP_FAILED, PASSWORD_RESET_COMPLETED, ACCOUNT_VERIFICATION_COMPLETED
 * @param {string} ipAddress 
 */
const logAudit = async (email, action, ipAddress = null) => {
  try {
    await db.query(
      `INSERT INTO audit_logs (email, action, ip_address) VALUES ($1, $2, $3)`,
      [email, action, ipAddress]
    );
  } catch (err) {
    console.error('Failed to log audit event:', err.message);
  }
};

module.exports = {
  logAudit
};
