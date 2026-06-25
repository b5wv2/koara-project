const db = require('../config/db');

/**
 * Resolve the best active provider for a given platform product.
 * Returns: { provider: { id, name }, provider_product_id, cost_price, currency_code }
 * or null if no active mapping exists.
 */
const resolveProvider = async (productId) => {
  const result = await db.query(`
    SELECT 
      pp.provider_product_id,
      pp.cost_price,
      pp.currency_code,
      p.id AS provider_id,
      p.name AS provider_name
    FROM provider_products pp
    JOIN providers p ON p.id = pp.provider_id
    WHERE pp.product_id = $1
      AND pp.is_active = true
      AND p.status = 'active'
    ORDER BY pp.cost_price ASC NULLS LAST
    LIMIT 1
  `, [productId]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    provider: { id: row.provider_id, name: row.provider_name },
    provider_product_id: row.provider_product_id,
    cost_price: row.cost_price ? parseFloat(row.cost_price) : null,
    currency_code: row.currency_code
  };
};

/**
 * Get all active provider mappings for a product.
 */
const getProviderMappings = async (productId) => {
  const result = await db.query(`
    SELECT 
      pp.*,
      p.name AS provider_name
    FROM provider_products pp
    JOIN providers p ON p.id = pp.provider_id
    WHERE pp.product_id = $1
    ORDER BY pp.is_active DESC, pp.cost_price ASC NULLS LAST
  `, [productId]);

  return result.rows;
};

module.exports = { resolveProvider, getProviderMappings };
