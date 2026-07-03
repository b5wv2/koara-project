/**
 * Merchant product service.
 * Merchant-specific product operations (enable, price, customization).
 */
import { apiFetch, jsonFetch, API_BASE_URL } from './api';

export async function fetchMerchantPlatformProducts(storeId) {
  try {
    const { ok, data } = await apiFetch(`/api/merchant/products?store_id=${storeId}`);
    if (ok) {
      return data.products || [];
    }
    return [];
  } catch (err) {
    console.error('Error fetching merchant platform products:', err);
    return [];
  }
}

export async function updateMerchantProduct(productId, storeId, updates) {
  try {
    const { ok, data } = await jsonFetch(`/api/merchant/products/${productId}`, 'PUT', {
      store_id: storeId,
      ...updates,
    });
    if (ok) {
      return { success: true, merchant_product: data.merchant_product };
    }
    return { success: false, message: data.error };
  } catch (err) {
    return { success: false, message: 'Connection error' };
  }
}

export async function uploadProductImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/api/merchant/products/upload-image`, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();

  if (data.success) {
    return { success: true, url: data.url };
  }
  return { success: false, message: data.error || 'Upload failed' };
}
