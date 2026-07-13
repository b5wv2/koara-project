const reservedSubdomains = [
  'api', 'www', 'admin', 'dashboard', 'auth', 'mail', 
  'smtp', 'cdn', 'assets', 'static', 'docs', 'support', 
  'blog', 'status'
];

/**
 * Validates a subdomain string against Koara requirements.
 * @param {string} subdomain 
 * @returns {object} { isValid: boolean, error: string|null }
 */
const validateSubdomainFormat = (subdomain) => {
  if (!subdomain) {
    return { isValid: false, error: 'Subdomain is required.' };
  }

  const sub = subdomain.toLowerCase().trim();

  // 1. Reserved words check
  if (reservedSubdomains.includes(sub)) {
    return { isValid: false, error: 'This subdomain is reserved and cannot be used.' };
  }

  // 2. Length check
  if (sub.length < 3 || sub.length > 50) {
    return { isValid: false, error: 'Subdomain must be between 3 and 50 characters.' };
  }

  // 3. Regex check
  const validRegex = /^[a-z0-9-]+$/;
  if (!validRegex.test(sub)) {
    return { isValid: false, error: 'Subdomain can only contain lowercase letters, numbers, and hyphens.' };
  }

  // 4. Consecutive hyphens
  if (sub.includes('--')) {
    return { isValid: false, error: 'Subdomain cannot contain consecutive hyphens.' };
  }

  // 5. Edge hyphens
  if (sub.startsWith('-') || sub.endsWith('-')) {
    return { isValid: false, error: 'Subdomain cannot start or end with a hyphen.' };
  }

  return { isValid: true, error: null };
};

module.exports = {
  validateSubdomainFormat,
  reservedSubdomains
};
