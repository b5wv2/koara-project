const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// Initialize Resend
const resendApiKey = process.env.RESEND_API_KEY;
const resend = new Resend(resendApiKey);

// A default from email if not configured
const FROM_EMAIL = process.env.FROM_EMAIL;

const crypto = require('crypto');

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 * @returns {string} 6-digit OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Load HTML template from filesystem and replace placeholders
 * @param {string} templateName - Name of the template file (e.g. 'verification-email.html')
 * @param {string} code - The 6-digit code
 * @returns {string} Rendered HTML
 */
const getTemplate = (templateName, code) => {
  const templatePath = path.join(__dirname, '../templates', templateName);
  let html = fs.readFileSync(templatePath, 'utf8');

  html = html
    .replace('{{digit1}}', code[0])
    .replace('{{digit2}}', code[1])
    .replace('{{digit3}}', code[2])
    .replace('{{digit4}}', code[3])
    .replace('{{digit5}}', code[4])
    .replace('{{digit6}}', code[5]);

  return html;
};

/**
 * Send Email via Resend
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} templateName - Template to use
 * @param {string} code - The code to render
 */
const sendEmail = async (to, subject, templateName, code) => {
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY is not set. Email not sent. Code generated was:', code);
    return true; // Pretend it succeeded for dev mode without key
  }

  const html = getTemplate(templateName, code);

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log('Email sent successfully:', data.id);
    return true;
  } catch (error) {
    console.error('Error sending email via Resend:', error);
    return false;
  }
};

module.exports = {
  generateOTP,
  sendEmail
};
