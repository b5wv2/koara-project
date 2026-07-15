/**
 * Order service.
 * Merchant order management operations.
 */
import { apiFetch, jsonFetch, API_BASE_URL } from './api';

export async function fetchMerchantOrders(storeId) {
  try {
    console.log('[DEBUG-FRONTEND-SVC] Fetching merchant orders for storeId:', storeId);
    const { ok, data } = await apiFetch(`/api/merchant/orders?store_id=${storeId}`);
    if (ok) {
      console.log('[DEBUG-FRONTEND-SVC] Received response:', data);
      return data.orders || [];
    }
    console.log('[DEBUG-FRONTEND-SVC] Received non-ok response. ok:', ok, 'data:', data);
    return [];
  } catch (err) {
    console.error('Error fetching merchant orders:', err);
    return [];
  }
}

export async function updateOrderStatus(orderId, storeId, status, isTopup = false) {
  try {
    let url;
    let body;
    let method;

    if (isTopup) {
      url = `/api/merchant/topups/orders/${orderId}/${status === 'approved' ? 'approve' : 'reject'}`;
      body = { store_id: storeId };
      method = 'POST';
    } else {
      url = `/api/merchant/orders/${orderId}/status`;
      body = { store_id: storeId, status };
      method = 'PUT';
    }

    const { ok, data } = await jsonFetch(url, method, body);
    if (ok && (data.success || data.order)) {
      return { success: true };
    }
    return { success: false, message: data.error || 'Update failed' };
  } catch (err) {
    console.error('Error updating order status:', err);
    return { success: false, message: 'Connection error' };
  }
}

/**
 * Submit a customer order (from storefront).
 * Uses FormData for receipt file upload.
 */
export async function submitCustomerOrder(storeId, formData) {
  const response = await fetch(`${API_BASE_URL}/api/store/${storeId}/orders`, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();

  if (response.ok && data.success) {
    return { success: true, order: data.order };
  }
  return { success: false, message: data.error || 'Failed to submit order.' };
}
