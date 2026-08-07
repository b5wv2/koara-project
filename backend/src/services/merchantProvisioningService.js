const notificationService = require('./notificationService');

/**
 * Provisions a merchant from a store_request.
 * This is the Single Source of Truth for merchant creation.
 * 
 * @param {Number} storeRequestId The ID of the store_request record
 * @param {Object} client The active db client with a running transaction
 * @returns {Object} { user, store, request }
 */
async function provisionMerchant(storeRequestId, client) {
  // 1. Fetch the request
  const requestResult = await client.query('SELECT * FROM store_requests WHERE id = $1', [storeRequestId]);
  if (requestResult.rows.length === 0) {
    throw new Error('Store request not found');
  }
  const request = requestResult.rows[0];

  // 2. Create the user
  const insertUserQuery = `
    INSERT INTO users (name, email, password_hash, role, status)
    VALUES ($1, $2, $3, 'merchant', 'active')
    RETURNING *;
  `;
  const userResult = await client.query(insertUserQuery, [request.applicant_name, request.email, request.password_hash]);
  const newUser = userResult.rows[0];

  // 3. Create the store
  const insertStoreQuery = `
    INSERT INTO stores (owner_id, store_name, subdomain, status, bank_name, account_name, account_no, store_currency)
    VALUES ($1, $2, $3, 'active', $4, $5, $6, $7)
    RETURNING *;
  `;
  const storeResult = await client.query(insertStoreQuery, [
    newUser.id,
    request.store_name,
    request.subdomain,
    request.bank_name,
    request.account_holder_name,
    request.account_number,
    request.store_currency || 'USD'
  ]);
  const newStore = storeResult.rows[0];

  // 4. Update request status
  await client.query('UPDATE store_requests SET status = $1 WHERE id = $2', ['approved', storeRequestId]);

  // 5. Trigger notification (doesn't throw on error)
  try {
    await notificationService.sendStoreApproved(request.email, request.store_name, request.subdomain);
  } catch (err) {
    console.error('Failed to send store approval notification:', err.message);
  }

  // 6. Return created entities
  return { user: newUser, store: newStore, request };
}

module.exports = {
  provisionMerchant
};
