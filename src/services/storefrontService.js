/**
 * Storefront service.
 * Public-facing store catalog and top-up catalog fetching.
 */
import { apiFetch, API_BASE_URL } from './api';

export async function fetchStoreCatalog(storeId) {
  try {
    const { ok, data } = await apiFetch(`/api/store/${storeId}/catalog`);
    if (ok && data.success) {
      return {
        success: true,
        categories: data.categories || [],
        products: data.products || [],
        promos: data.promos || [],
        platform_products: data.platform_products || [],
      };
    }
    return { success: false, error: 'Failed to load catalog.' };
  } catch (err) {
    console.error('Error fetching catalog:', err);
    return { success: false, error: 'Connection error while loading catalog.' };
  }
}

export async function fetchTopupsCatalog(storeId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/store/topups/catalog/${storeId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return {
          success: true,
          category: data.category,
          fields: data.fields || [],
          offers: data.offers || [],
        };
      }
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}
