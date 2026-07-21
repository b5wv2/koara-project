const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const { generateOTP, sendEmail } = require('../services/emailService');
const { logAudit } = require('../services/auditService');
const { validateSubdomainFormat } = require('../utils/subdomainValidation');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const setSessionCookie = (res, user) => {
  const payload = {
    id: user.id,
    role: user.role,
    email: user.email
  };
  if (user.storeRequestId) {
    payload.storeRequestId = user.storeRequestId;
  }
  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.cookie('koara_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed!'));
    }
  }
});

// Helper for sending rate limit
const checkRateLimit = async (email) => {
  const recentCheck = await db.query(`SELECT COUNT(*) FROM audit_logs WHERE email = $1 AND action IN ('OTP_GENERATED', 'OTP_RESENT') AND created_at > NOW() - INTERVAL '15 minutes'`, [email]);
  if (parseInt(recentCheck.rows[0].count) >= 3) return false;

  const dailyCheck = await db.query(`SELECT COUNT(*) FROM audit_logs WHERE email = $1 AND action IN ('OTP_GENERATED', 'OTP_RESENT') AND created_at > NOW() - INTERVAL '24 hours'`, [email]);
  if (parseInt(dailyCheck.rows[0].count) >= 10) return false;

  return true;
};

// Helper for Verify IP Rate Limit (10 per 15 min)
const checkIPVerifyRateLimit = async (ip) => {
  const recentCheck = await db.query(
    `SELECT COUNT(*) FROM audit_logs WHERE ip_address = $1 AND action = 'VERIFY_ATTEMPT' AND created_at > NOW() - INTERVAL '15 minutes'`,
    [ip]
  );
  if (parseInt(recentCheck.rows[0].count) >= 10) return false;
  return true;
};

// Helper for Global Email Lock
const checkGlobalEmailLock = async (email) => {
  const lockCheck = await db.query(`SELECT * FROM email_locks WHERE email = $1`, [email]);
  if (lockCheck.rows.length > 0) {
    const lock = lockCheck.rows[0];
    if (lock.blocked_until && new Date(lock.blocked_until) > new Date()) {
      return { isLocked: true, blocked_until: lock.blocked_until };
    }
  }
  return { isLocked: false, blocked_until: null };
};

// Helper for handling failed verification attempts
const handleFailedAttempt = async (email, verificationId, currentOTPAttempts) => {
  // 1. Increment OTP attempts
  const newOTPAttempts = currentOTPAttempts + 1;
  if (newOTPAttempts >= 5) {
    // Permanently invalidate OTP
    await db.query(`UPDATE email_verifications SET attempts = $1, expires_at = NOW() - INTERVAL '1 second' WHERE id = $2`, [newOTPAttempts, verificationId]);
  } else {
    await db.query(`UPDATE email_verifications SET attempts = $1 WHERE id = $2`, [newOTPAttempts, verificationId]);
  }

  // 2. Update global email lock
  const lockQuery = await db.query(`SELECT * FROM email_locks WHERE email = $1`, [email]);
  let newFailedAttempts = 1;
  let newLockCount = 0;

  if (lockQuery.rows.length === 0) {
    await db.query(`INSERT INTO email_locks (email, failed_attempts) VALUES ($1, $2)`, [email, newFailedAttempts]);
  } else {
    const lock = lockQuery.rows[0];
    newFailedAttempts = lock.failed_attempts + 1;
    newLockCount = lock.lock_count;

    if (newFailedAttempts >= 5) {
      newLockCount += 1;
      let penaltyMinutes = 15; // 1st lock
      if (newLockCount === 2) penaltyMinutes = 60; // 2nd lock
      else if (newLockCount >= 3) penaltyMinutes = 24 * 60; // 3rd+ lock

      const blockedUntil = new Date(Date.now() + penaltyMinutes * 60000);
      await db.query(
        `UPDATE email_locks SET failed_attempts = 0, lock_count = $1, blocked_until = $2 WHERE email = $3`,
        [newLockCount, blockedUntil, email]
      );

      return { isLocked: true, blocked_until: blockedUntil };
    } else {
      await db.query(`UPDATE email_locks SET failed_attempts = $1 WHERE email = $2`, [newFailedAttempts, email]);
    }
  }

  return { isLocked: false, blocked_until: null };
};

// Helper for successful verification cleanup
const handleSuccessfulVerification = async (email, otpId) => {
  // Delete the specific OTP
  await db.query(`DELETE FROM email_verifications WHERE id = $1`, [otpId]);
  // Clear the global lock
  await db.query(`DELETE FROM email_locks WHERE email = $1`, [email]);
};


// POST /signup route
router.post('/signup', upload.single('kyc_document'), async (req, res) => {
  const { name, email, password, store_name, bank_name, account_holder_name, account_number, subdomain } = req.body;

  // Validate request inputs
  if (!name || !email || !password || !store_name || !bank_name || !account_holder_name || !account_number || !subdomain) {
    return res.status(400).json({ error: 'All fields including bank details and subdomain are required.' });
  }

  // Validate subdomain format and rules
  const validation = validateSubdomainFormat(subdomain);
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.error });
  }
  const cleanSubdomain = subdomain.toLowerCase().trim();

  if (!req.file) {
    return res.status(400).json({ error: 'KYC Document is required.' });
  }

  // Verify that the email was verified via OTP
  // For signup, since we delete OTPs on success, we check if the user is in users/store_requests.
  // Wait, if we delete OTP on success, how does signup know email was verified?
  // Ah, currently signup relies on `email_verifications.verified = TRUE`.
  // If we delete it in `handleSuccessfulVerification`, signup won't find it!
  // Since signup happens *after* verify-registration-code, we must NOT delete the record, 
  // or we need to mark it verified but KEEP it until signup finishes, OR we change the flow.
  // The plan states "Ensure successful OTP verification deletes the record completely". 
  // For password reset it's fine. For registration, if we delete it, `signup` will fail.
  // Let's modify signup to NOT fail if we delete it, but how do we know they verified?
  // Actually, we can keep the `verified = TRUE` record, but delete it inside `/signup`!
  // That's much safer. So for registration, verify marks it true. Signup deletes it.

  try {
    const verifCheck = await db.query(
      `SELECT id FROM email_verifications WHERE email = $1 AND type = 'registration' AND verified = TRUE`,
      [email.trim()]
    );
    if (verifCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Email address has not been verified.' });
    }
  } catch (error) {
    console.error('Error checking email verification:', error);
    return res.status(500).json({ error: 'Failed to verify email status.' });
  }

  const kyc_document_url = `/uploads/${req.file.filename}`;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Double check subdomain global uniqueness
    const storeCheck = await client.query('SELECT id FROM stores WHERE subdomain = $1', [cleanSubdomain]);
    if (storeCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Subdomain is already taken.' });
    }
    const requestCheck = await client.query(`SELECT id FROM store_requests WHERE subdomain = $1 AND status = 'pending'`, [cleanSubdomain]);
    if (requestCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Subdomain is already reserved by a pending request.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const insertRequestQuery = `
      INSERT INTO store_requests (applicant_name, email, password_hash, store_name, bank_name, account_holder_name, account_number, kyc_document_url, status, subdomain)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
      RETURNING id, applicant_name as name, email, store_name, status, created_at, subdomain;
    `;
    const requestResult = await client.query(insertRequestQuery, [
      name.trim(),
      email.trim(),
      passwordHash,
      store_name.trim(),
      bank_name.trim(),
      account_holder_name.trim(),
      account_number.trim(),
      kyc_document_url,
      cleanSubdomain
    ]);
    const newRequest = requestResult.rows[0];

    // Delete the verified registration OTP now that it's consumed
    await client.query(`DELETE FROM email_verifications WHERE email = $1 AND type = 'registration'`, [email.trim()]);

    await client.query('COMMIT');

    setSessionCookie(res, {
      id: newRequest.id,
      role: 'applicant',
      email: newRequest.email,
      storeRequestId: newRequest.id
    });

    res.status(201).json({
      success: true,
      message: 'Store application submitted successfully and is pending review.',
      request: newRequest
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database transaction error during merchant signup:', error.message);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email address or subdomain already exists.' });
    }
    res.status(500).json({ error: 'An internal database error occurred. Please try again.' });
  } finally {
    client.release();
  }
});

// POST /google-login route
router.post('/google-login', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: 'Google ID Token is required.' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture: avatarUrl } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Email not provided by Google.' });
    }

    // Check if user exists
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const userResult = await db.query(userQuery, [email.trim()]);

    if (userResult.rows.length === 0) {
      // User is not in users table. Check store_requests table.
      const requestQuery = 'SELECT * FROM store_requests WHERE email = $1';
      const requestResult = await db.query(requestQuery, [email.trim()]);

      if (requestResult.rows.length > 0) {
        // User has a pending or rejected store request
        const reqStore = requestResult.rows[0];
        setSessionCookie(res, {
          id: reqStore.owner_id || reqStore.id,
          role: 'applicant',
          email: reqStore.email,
          storeRequestId: reqStore.id
        });
        return res.status(200).json({
          isStoreRequest: true,
          status: reqStore.status,
          rejection_reason: reqStore.rejection_reason,
          store_request: reqStore
        });
      }

      // Account does not exist anywhere. Trigger onboarding automatically.
      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

      // Delete existing unused registration codes
      await db.query(`DELETE FROM email_verifications WHERE email = $1 AND type = 'registration'`, [email]);

      await db.query(
        `INSERT INTO email_verifications (email, code, type, expires_at) VALUES ($1, $2, 'registration', $3)`,
        [email, code, expiresAt]
      );

      const sent = await sendEmail(email, 'Verify Your Email - Koara', 'verification-email.html', code);
      if (!sent) {
        return res.status(500).json({ message: 'Failed to send verification email. Please try again later.' });
      }

      await logAudit(email, 'OTP_GENERATED_GOOGLE_SIGNUP', req.ip);

      return res.status(200).json({ status: 'requires_onboarding', email: email, message: 'Verification code sent to your Google email.' });
    }

    let user = userResult.rows[0];

    // If user exists, ensure account is linked
    if (user.auth_provider !== 'google') {
      const updateQuery = `
        UPDATE users 
        SET google_id = $1, auth_provider = 'google', avatar_url = COALESCE(avatar_url, $2)
        WHERE id = $3
        RETURNING *
      `;
      const updatedUserResult = await db.query(updateQuery, [googleId, avatarUrl, user.id]);
      user = updatedUserResult.rows[0];
    }

    // Get store info
    let store = null;
    const storeQuery = 'SELECT * FROM stores WHERE owner_id = $1';
    const storeResult = await db.query(storeQuery, [user.id]);
    if (storeResult.rows.length > 0) {
      store = storeResult.rows[0];
    }

    setSessionCookie(res, user);

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      store: store ? {
        id: store.id,
        store_name: store.store_name,
        subdomain: store.subdomain,
        status: store.status,
        bank_name: store.bank_name,
        account_no: store.account_no,
        account_name: store.account_name,
        balance: store.balance
      } : null
    });

  } catch (error) {
    console.error('Google login verification failed:', error.message);
    return res.status(401).json({ message: 'Invalid Google Token. Please try again.' });
  }
});


// POST /login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const userResult = await db.query(userQuery, [email.trim()]);

    if (userResult.rows.length === 0) {
      const requestQuery = 'SELECT * FROM store_requests WHERE email = $1';
      const requestResult = await db.query(requestQuery, [email.trim()]);

      if (requestResult.rows.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials. Please try again.' });
      }

      const reqStore = requestResult.rows[0];
      const isMatchReq = await bcrypt.compare(password, reqStore.password_hash);
      if (!isMatchReq) {
        return res.status(401).json({ message: 'Invalid credentials. Please try again.' });
      }

      setSessionCookie(res, {
        id: reqStore.owner_id || reqStore.id,
        role: 'applicant',
        email: reqStore.email,
        storeRequestId: reqStore.id
      });

      return res.status(200).json({
        status: reqStore.status,
        rejection_reason: reqStore.rejection_reason,
        store_request: reqStore
      });
    }

    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials. Please try again.' });
    }

    let store = null;
    const storeQuery = 'SELECT * FROM stores WHERE owner_id = $1';
    const storeResult = await db.query(storeQuery, [user.id]);
    if (storeResult.rows.length > 0) {
      store = storeResult.rows[0];
    }

    setSessionCookie(res, user);

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      store: store ? {
        id: store.id,
        store_name: store.store_name,
        subdomain: store.subdomain,
        status: store.status,
        bank_name: store.bank_name,
        account_no: store.account_no,
        account_name: store.account_name,
        balance: store.balance
      } : null
    });
  } catch (error) {
    console.error('Database query error during merchant login:', error.message);
    return res.status(500).json({ message: 'An internal database error occurred. Please try again.' });
  }
});

// GET /me route (Session Restoration)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userQuery = 'SELECT id, name, email, role FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    const user = userResult.rows[0];

    let store = null;
    const storeQuery = 'SELECT * FROM stores WHERE owner_id = $1';
    const storeResult = await db.query(storeQuery, [user.id]);
    if (storeResult.rows.length > 0) {
      store = storeResult.rows[0];
    }

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      store: store ? {
        id: store.id,
        store_name: store.store_name,
        subdomain: store.subdomain,
        status: store.status,
        bank_name: store.bank_name,
        account_no: store.account_no,
        account_name: store.account_name,
        balance: store.balance
      } : null
    });
  } catch (error) {
    console.error('Error restoring session:', error.message);
    return res.status(500).json({ message: 'Server error restoring session.' });
  }
});

// POST /logout route
router.post('/logout', (req, res) => {
  res.clearCookie('koara_session', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// POST /resubmit route
router.post('/resubmit', authMiddleware, upload.single('kyc_document'), async (req, res) => {
  const { store_id, bank_name, account_holder_name, account_number } = req.body;

  if (!store_id || !bank_name || !account_holder_name || !account_number) {
    return res.status(400).json({ error: 'All bank details are required for resubmission.' });
  }

  try {
    const ownershipCheck = await db.query(
      `SELECT id, email, owner_id FROM store_requests WHERE id = $1 AND status = 'rejected'`,
      [store_id]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Rejected store request not found.' });
    }

    const reqRow = ownershipCheck.rows[0];
    const isOwner =
      (req.user.email && reqRow.email.toLowerCase() === req.user.email.toLowerCase()) ||
      (req.user.storeRequestId && Number(req.user.storeRequestId) === Number(reqRow.id)) ||
      (req.user.id && reqRow.owner_id && Number(req.user.id) === Number(reqRow.owner_id));

    if (!isOwner) {
      return res.status(403).json({ error: 'Unauthorized: You do not own this store request.' });
    }

    let updateQuery;
    let queryParams;

    if (req.file) {
      const kyc_document_url = `/uploads/${req.file.filename}`;
      updateQuery = `
        UPDATE store_requests
        SET bank_name = $1, account_holder_name = $2, account_number = $3, kyc_document_url = $4, status = 'pending', rejection_reason = NULL, reviewed_by = NULL, reviewed_at = NULL
        WHERE id = $5 AND status = 'rejected'
        RETURNING *
      `;
      queryParams = [bank_name.trim(), account_holder_name.trim(), account_number.trim(), kyc_document_url, store_id];
    } else {
      updateQuery = `
        UPDATE store_requests
        SET bank_name = $1, account_holder_name = $2, account_number = $3, status = 'pending', rejection_reason = NULL, reviewed_by = NULL, reviewed_at = NULL
        WHERE id = $4 AND status = 'rejected'
        RETURNING *
      `;
      queryParams = [bank_name.trim(), account_holder_name.trim(), account_number.trim(), store_id];
    }

    const result = await db.query(updateQuery, queryParams);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rejected store request not found.' });
    }

    res.status(200).json({ success: true, message: 'Application resubmitted successfully.' });
  } catch (error) {
    console.error('Error during resubmission:', error.message);
    res.status(500).json({ error: 'An internal database error occurred.' });
  }
});

// POST /send-registration-code
router.post('/send-registration-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const lockStatus = await checkGlobalEmailLock(email);
    if (lockStatus.isLocked) {
      return res.status(429).json({
        error: 'Too many failed verification attempts. Please try again later.',
        blocked_until: lockStatus.blocked_until
      });
    }

    const isAllowed = await checkRateLimit(email);
    if (!isAllowed) {
      return res.status(429).json({ error: 'Too many verification requests. Please try again later.' });
    }

    const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) return res.status(409).json({ error: 'Email is already registered.' });

    const reqCheck = await db.query('SELECT id FROM store_requests WHERE email = $1', [email]);
    if (reqCheck.rows.length > 0) return res.status(409).json({ error: 'Store request with this email already exists.' });

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

    // Delete existing unused registration codes
    await db.query(`DELETE FROM email_verifications WHERE email = $1 AND type = 'registration'`, [email]);

    await db.query(
      `INSERT INTO email_verifications (email, code, type, expires_at) VALUES ($1, $2, 'registration', $3)`,
      [email, code, expiresAt]
    );

    const sent = await sendEmail(email, 'Verify Your Email - Koara', 'verification-email.html', code);
    if (!sent) return res.status(500).json({ error: 'Failed to send verification email.' });

    await logAudit(email, 'OTP_GENERATED', req.ip);

    res.status(200).json({ success: true, message: 'Verification code sent.' });
  } catch (error) {
    console.error('Error sending registration code:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /verify-registration-code
router.post('/verify-registration-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code are required.' });

  try {
    // 1. IP Rate limit check
    await logAudit(email, 'VERIFY_ATTEMPT', req.ip);
    const ipAllowed = await checkIPVerifyRateLimit(req.ip);
    if (!ipAllowed) return res.status(429).json({ error: 'Too many requests.' });

    // 2. Global Email Lock check
    const lockStatus = await checkGlobalEmailLock(email);
    if (lockStatus.isLocked) {
      return res.status(429).json({
        error: 'Account verification temporarily locked.',
        blocked_until: lockStatus.blocked_until
      });
    }

    const result = await db.query(
      `SELECT * FROM email_verifications WHERE email = $1 AND type = 'registration' ORDER BY created_at DESC LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      await logAudit(email, 'OTP_FAILED', req.ip);
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    const verification = result.rows[0];

    // 3. Expiration check
    if (new Date(verification.expires_at) < new Date()) {
      await logAudit(email, 'OTP_EXPIRED', req.ip);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    // 4. Validate code
    if (verification.code !== code) {
      await logAudit(email, 'OTP_FAILED', req.ip);
      const lockResult = await handleFailedAttempt(email, verification.id, verification.attempts);

      if (lockResult.isLocked) {
        return res.status(429).json({
          error: 'Too many failed attempts. Verification has been temporarily locked.',
          blocked_until: lockResult.blocked_until
        });
      } else {
        return res.status(400).json({ error: 'Invalid verification code.' });
      }
    }

    // Success (keep record for signup to use, but mark verified. Clear global locks.)
    await db.query(`UPDATE email_verifications SET verified = TRUE WHERE id = $1`, [verification.id]);
    await db.query(`DELETE FROM email_locks WHERE email = $1`, [email]);

    await logAudit(email, 'OTP_VERIFIED', req.ip);
    await logAudit(email, 'ACCOUNT_VERIFICATION_COMPLETED', req.ip);

    res.status(200).json({ success: true, message: 'Email verified successfully.' });
  } catch (error) {
    console.error('Error verifying registration code:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const lockStatus = await checkGlobalEmailLock(email);
    if (lockStatus.isLocked) {
      return res.status(429).json({
        error: 'Too many failed verification attempts. Please try again later.',
        blocked_until: lockStatus.blocked_until
      });
    }

    const isAllowed = await checkRateLimit(email);
    if (!isAllowed) {
      return res.status(429).json({ error: 'Too many verification requests. Please try again later.' });
    }

    const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    const reqCheck = await db.query('SELECT id FROM store_requests WHERE email = $1', [email]);

    if (userCheck.rows.length === 0 && reqCheck.rows.length === 0) {
      return res.status(200).json({ success: true, message: 'If the email exists, a reset code was sent.' });
    }

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

    await db.query(`DELETE FROM email_verifications WHERE email = $1 AND type = 'password_reset'`, [email]);

    await db.query(
      `INSERT INTO email_verifications (email, code, type, expires_at) VALUES ($1, $2, 'password_reset', $3)`,
      [email, code, expiresAt]
    );

    await sendEmail(email, 'Password Reset - Koara', 'password-reset-email.html', code);

    await logAudit(email, 'OTP_GENERATED', req.ip);

    res.status(200).json({ success: true, message: 'If the email exists, a reset code was sent.' });
  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /verify-reset-code
router.post('/verify-reset-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code are required.' });

  try {
    await logAudit(email, 'VERIFY_ATTEMPT', req.ip);
    const ipAllowed = await checkIPVerifyRateLimit(req.ip);
    if (!ipAllowed) return res.status(429).json({ error: 'Too many requests.' });

    const emailAllowed = await checkGlobalEmailLock(email);
    if (!emailAllowed) return res.status(429).json({ error: 'Account verification temporarily locked.' });

    const result = await db.query(
      `SELECT * FROM email_verifications WHERE email = $1 AND type = 'password_reset' ORDER BY created_at DESC LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      await logAudit(email, 'OTP_FAILED', req.ip);
      return res.status(400).json({ error: 'Invalid or expired reset code.' });
    }

    const verification = result.rows[0];

    if (new Date(verification.expires_at) < new Date()) {
      await logAudit(email, 'OTP_EXPIRED', req.ip);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    if (verification.code !== code) {
      await logAudit(email, 'OTP_FAILED', req.ip);
      const lockResult = await handleFailedAttempt(email, verification.id, verification.attempts);

      if (lockResult.isLocked) {
        return res.status(429).json({
          error: 'Too many failed attempts. Verification has been temporarily locked.',
          blocked_until: lockResult.blocked_until
        });
      } else {
        return res.status(400).json({ error: 'Invalid reset code.' });
      }
    }

    // DO NOT delete it here, it needs to be retained for POST /reset-password
    await db.query(`UPDATE email_verifications SET verified = TRUE WHERE id = $1`, [verification.id]);
    await db.query(`DELETE FROM email_locks WHERE email = $1`, [email]);

    await logAudit(email, 'OTP_VERIFIED', req.ip);
    res.status(200).json({ success: true, message: 'Code verified successfully.' });
  } catch (error) {
    console.error('Error verifying reset code:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /reset-password
router.post('/reset-password', async (req, res) => {
  const { email, code, password } = req.body;
  if (!email || !code || !password) return res.status(400).json({ error: 'Email, code, and new password are required.' });

  try {
    const result = await db.query(
      `SELECT * FROM email_verifications WHERE email = $1 AND type = 'password_reset' AND verified = TRUE ORDER BY created_at DESC LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset code.' });
    }

    const verification = result.rows[0];

    if (verification.code !== code) {
      return res.status(400).json({ error: 'Invalid reset code.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const updateUsers = await db.query(`UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id`, [passwordHash, email]);

    if (updateUsers.rows.length === 0) {
      await db.query(`UPDATE store_requests SET password_hash = $1 WHERE email = $2`, [passwordHash, email]);
    }

    // Delete ALL OTPs for this email after a successful password reset
    await handleSuccessfulVerification(email, verification.id);

    await logAudit(email, 'PASSWORD_RESET_COMPLETED', req.ip);

    res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
