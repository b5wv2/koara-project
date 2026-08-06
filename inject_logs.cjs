const fs = require('fs');
let code = fs.readFileSync('backend/src/routes/auth.js', 'utf8');

const replacement = `
  try {
    console.log('1. checkGlobalEmailLock');
    const lockStatus = await checkGlobalEmailLock(email);
    if (lockStatus.isLocked) {
      return res.status(429).json({
        error: 'Too many failed verification attempts. Please try again later.',
        blocked_until: lockStatus.blocked_until
      });
    }

    console.log('2. checkRateLimit');
    const isAllowed = await checkRateLimit(email);
    if (!isAllowed) {
      return res.status(429).json({ error: 'Too many verification requests. Please try again later.' });
    }

    console.log('3. check users');
    const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) return res.status(409).json({ error: 'Email is already registered.' });

    console.log('4. check store_requests');
    const reqCheck = await db.query('SELECT id FROM store_requests WHERE email = $1', [email]);
    if (reqCheck.rows.length > 0) return res.status(409).json({ error: 'Store request with this email already exists.' });

    console.log('5. generateOTP');
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

    console.log('6. delete old');
    await db.query(\`DELETE FROM email_verifications WHERE email = $1 AND type = 'registration'\`, [email]);

    console.log('7. insert new');
    await db.query(
      \`INSERT INTO email_verifications (email, code, type, expires_at) VALUES ($1, $2, 'registration', $3)\`,
      [email, code, expiresAt]
    );

    console.log('8. sendEmail');
    const sent = await sendEmail(email, 'Verify Your Email - Koara', 'verification-email.html', code);
    if (!sent) return res.status(500).json({ error: 'Failed to send verification email.' });

    console.log('9. logAudit');
    await logAudit(email, 'OTP_GENERATED', req.ip);

    console.log('10. respond');
    res.status(200).json({ success: true, message: 'Verification code sent.' });
`;

const startIndex = code.indexOf('  try {\r\n    const lockStatus = await checkGlobalEmailLock(email);');
if (startIndex !== -1) {
  const endIndex = code.indexOf('  } catch (error) {', startIndex);
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync('backend/src/routes/auth.js', code);
  console.log('Injected logs');
} else {
  const startIndex2 = code.indexOf('  try {\n    const lockStatus = await checkGlobalEmailLock(email);');
  if (startIndex2 !== -1) {
    const endIndex2 = code.indexOf('  } catch (error) {', startIndex2);
    code = code.substring(0, startIndex2) + replacement + code.substring(endIndex2);
    fs.writeFileSync('backend/src/routes/auth.js', code);
    console.log('Injected logs (\\n)');
  } else {
    console.log('Could not find injection point');
  }
}
