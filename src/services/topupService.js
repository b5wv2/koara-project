/**
 * Top-up service.
 * Merchant top-up product management and storefront top-up orders.
 */
import { apiFetch, jsonFetch, API_BASE_URL } from './api';

export async function fetchMerchantTopups(storeId) {
  try {
    const { ok, data } = await apiFetch(`/api/merchant/topups?store_id=${storeId}`);
    if (ok && data.success) {
      return data.topups || [];
    }
    return [];
  } catch (err) {
    console.error('Error fetching merchant topups:', err);
    return [];
  }
}

export async function updateTopup(offerId, storeId, updates) {
  try {
    await jsonFetch(`/api/merchant/topups/${offerId}`, 'PUT', {
      store_id: storeId,
      ...updates,
    });
    return { success: true };
  } catch (err) {
    return { success: false, message: 'Failed to save' };
  }
}

/**
 * Submit a top-up order from the storefront.
 * Uses FormData for receipt file upload.
 */
export async function submitTopupOrder(storeId, formData) {
  const response = await fetch(`${API_BASE_URL}/api/store/topups/order/${storeId}`, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();

  if (response.ok && data.success) {
    return { success: true, order: data.order };
  }
  return { success: false, message: data.error || 'Failed to submit top-up order.' };
}
