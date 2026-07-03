/**
 * Currency formatting utilities.
 */

/**
 * Format a numeric value as USD currency string.
 * @param {number|string} amount
 * @returns {string} e.g. "$12.50"
 */
export function formatCurrency(amount) {
  return `$${parseFloat(amount || 0).toFixed(2)}`;
}

/**
 * Format a wallet balance for display.
 * @param {number|string} balance
 * @returns {string} e.g. "$1,234.56"
 */
export function formatBalance(balance) {
  const num = parseFloat(balance || 0);
  return `$${num.toFixed(2)}`;
}
