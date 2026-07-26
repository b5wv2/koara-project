/**
 * General formatting utilities.
 */

/**
 * Format a date string for display in tables.
 * @param {string} dateString - ISO date string
 * @param {string} language - Active language (e.g., 'en', 'ar')
 * @returns {string} Locale-formatted date
 */
export function formatDate(dateString, language = 'en') {
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  return new Date(dateString).toLocaleString(locale);
}

/**
 * Format a currency amount based on the locale.
 * @param {number|string} amount
 * @param {string} language - Active language
 * @returns {string} Formatted amount
 */
export function formatCurrency(amount, language = 'en') {
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format a transaction ID for display.
 * @param {number|string} id
 * @returns {string} e.g. "TXN-42"
 */
export function formatTransactionId(id) {
  return `TXN-${id}`;
}

