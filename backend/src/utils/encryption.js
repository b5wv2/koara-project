const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes is standard and recommended for AES-GCM

/**
 * Derives a 32-byte encryption key from environment variable or secure fallback.
 */
function getKey() {
  const rawKey = process.env.ENCRYPTION_KEY || process.env.WEBHOOK_SECRET || 'koara-secure-giftcard-dev-secret-key-2026';
  // If rawKey is already a 64-character hex string representing 32 bytes, use it directly
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }
  // Otherwise derive a deterministic 32-byte SHA-256 hash Buffer from the string
  return crypto.createHash('sha256').update(String(rawKey)).digest();
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * @param {string} text - Plaintext to encrypt
 * @returns {string|null} Encrypted string in format iv:authTag:ciphertext (hex encoded)
 */
function encrypt(text) {
  if (text === null || text === undefined) {
    return null;
  }
  const stringText = String(text);
  if (!stringText) {
    return null;
  }

  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(stringText, 'utf8'),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (error) {
    console.error('[ENCRYPTION-ERROR] Failed to encrypt data:', error.message);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypts string using AES-256-GCM.
 * @param {string} encryptedString - Format iv:authTag:ciphertext
 * @returns {string|null} Decrypted plaintext
 */
function decrypt(encryptedString) {
  if (!encryptedString || typeof encryptedString !== 'string') {
    return null;
  }

  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  try {
    const [ivHex, authTagHex, ciphertextHex] = parts;
    const key = getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('[ENCRYPTION-ERROR] Failed to decrypt data:', error.message);
    throw new Error('Decryption failed or invalid authentication tag');
  }
}

module.exports = {
  encrypt,
  decrypt,
  getKey
};
