const express = require('express');
const { logAudit } = require('./src/services/auditService');
const { generateOTP, sendEmail } = require('./src/services/emailService');
const db = require('./src/config/db');

async function testRoute() {
  const email = 'test_db_queries@example.com';
  try {
    const lockCheck = await db.query(`SELECT * FROM email_locks WHERE email = $1`, [email]);
    console.log('checkGlobalEmailLock done');
    
    const recentCheck = await db.query(`SELECT COUNT(*) FROM audit_logs WHERE email = $1 AND action IN ('OTP_GENERATED', 'OTP_RESENT') AND created_at > NOW() - INTERVAL '15 minutes'`, [email]);
    console.log('checkRateLimit done');
    
    const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    console.log('userCheck done');
    
    const reqCheck = await db.query('SELECT id FROM store_requests WHERE email = $1', [email]);
    console.log('reqCheck done');
    
    const code = generateOTP();
    console.log('generateOTP done', code);
    
    const expiresAt = new Date(Date.now() + 10 * 60000);
    
    await db.query(`DELETE FROM email_verifications WHERE email = $1 AND type = 'registration'`, [email]);
    console.log('delete done');
    
    await db.query(
      `INSERT INTO email_verifications (email, code, type, expires_at) VALUES ($1, $2, 'registration', $3)`,
      [email, code, expiresAt]
    );
    console.log('insert done');
    
    const sent = await sendEmail(email, 'Verify Your Email - Koara', 'verification-email.html', code);
    console.log('sendEmail done', sent);
    
    await logAudit(email, 'OTP_GENERATED', '127.0.0.1');
    console.log('logAudit done');
    
    console.log('SUCCESS');
  } catch (err) {
    console.error('EXCEPTION:', err);
  }
}

require('dotenv').config();
testRoute().then(() => process.exit(0));
