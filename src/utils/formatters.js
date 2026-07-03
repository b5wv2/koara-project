/**
 * General formatting utilities.
 */

/**
 * Format a date string for display in tables.
 * @param {string} dateString - ISO date string
 * @returns {string} Locale-formatted date
 */
export function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}

/**
 * Format a transaction ID for display.
 * @param {number|string} id
 * @returns {string} e.g. "TXN-42"
 */
export function formatTransactionId(id) {
  return `TXN-${id}`;
}
