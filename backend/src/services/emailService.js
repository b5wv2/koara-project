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
 * @param {string} templateName - Name of the template file
 * @param {string|object} data - The 6-digit code or a dictionary of placeholders
 * @returns {string} Rendered HTML
 */
const getTemplate = (templateName, data = {}) => {
  const templatePath = path.join(__dirname, '../templates', templateName);
  let html = fs.readFileSync(templatePath, 'utf8');

  if (typeof data === 'string' && data.length === 6) {
    // Legacy support for 6-digit OTP
    html = html
      .replace('{{digit1}}', data[0])
      .replace('{{digit2}}', data[1])
      .replace('{{digit3}}', data[2])
      .replace('{{digit4}}', data[3])
      .replace('{{digit5}}', data[4])
      .replace('{{digit6}}', data[5]);
  } else if (typeof data === 'object') {
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, data[key]);
    });
  }

  return html;
};

/**
 * Send Email via Resend
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} templateName - Template to use
 * @param {string|object} data - The code or data to render
 */
const sendEmail = async (to, subject, templateName, data) => {
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY is not set. Email not sent. Data generated was:', data);
    return true; // Pretend it succeeded for dev mode without key
  }

  const html = getTemplate(templateName, data);

  try {
    const resData = await resend.emails.send({
      from: FROM_EMAIL || 'onboarding@resend.dev',
      to,
      subject,
      html,
    });
    console.log('Email sent successfully:', resData.id);
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
