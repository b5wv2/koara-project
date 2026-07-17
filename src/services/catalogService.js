/**
 * Catalog service.
 * Platform product CRUD + provider management.
 */
import { apiFetch, jsonFetch } from './api';

// ── Platform Products ──

export async function fetchPlatformProducts() {
  try {
    const { ok, data } = await apiFetch('/api/admin/catalog/products');
    if (ok) {
      return data.products || [];
    }
    return [];
  } catch (err) {
    console.error('Error fetching platform products:', err);
    return [];
  }
}

export async function createPlatformProduct(productData) {
  try {
    const { ok, data } = await jsonFetch('/api/admin/catalog/products', 'POST', productData);
    if (ok) {
      return { success: true, product: data.product };
    }
    return { success: false, message: data.error };
  } catch (err) {
    return { success: false, message: 'Connection error' };
  }
}

export async function updatePlatformProduct(id, productData) {
  try {
    const { ok, data } = await jsonFetch(`/api/admin/catalog/products/${id}`, 'PUT', productData);
    if (ok) {
      return { success: true, product: data.product };
    }
    return { success: false, message: data.error };
  } catch (err) {
    return { success: false, message: 'Connection error' };
  }
}

export async function deactivatePlatformProduct(id) {
  try {
    const { ok } = await apiFetch(`/api/admin/catalog/products/${id}`, { method: 'DELETE' });
    if (ok) {
      return { success: true };
    }
    return { success: false };
  } catch (err) {
    return { success: false, message: 'Connection error' };
  }
}

// ── Providers ──

export async function fetchProviders() {
  try {
    const { ok, status, data } = await apiFetch('/api/admin/catalog/providers');
    if (ok) {
      return Array.isArray(data?.providers) ? data.providers : (Array.isArray(data) ? data : []);
    }
    console.error(`Error fetching providers: HTTP ${status}`);
    return [];
  } catch (err) {
    console.error('Error fetching providers (network):', err);
    return [];
  }
}

export async function fetchProviderMappings(productId) {
  try {
    const { ok, data } = await apiFetch(`/api/admin/catalog/products/${productId}/providers`);
    if (ok) {
      return data.mappings || [];
    }
    return [];
  } catch (err) {
    return [];
  }
}

export async function addProviderMapping(productId, mappingData) {
  try {
    const { ok, data } = await jsonFetch(`/api/admin/catalog/products/${productId}/providers`, 'POST', mappingData);
    return ok
      ? { success: true, mapping: data.mapping }
      : { success: false, message: data.error };
  } catch (err) {
    return { success: false, message: 'Connection error' };
  }
}

// ── Provider Categories ──

export async function fetchProviderCategories(providerId = null) {
  try {
    const url = providerId 
      ? `/api/admin/catalog/provider-categories?provider_id=${providerId}` 
      : '/api/admin/catalog/provider-categories';
    const { ok, data } = await apiFetch(url);
    if (ok) {
      return data.categories || [];
    }
    return [];
  } catch (err) {
    console.error('Error fetching provider categories:', err);
    return [];
  }
}

export async function createProviderCategory(categoryData) {
  try {
    const { ok, data } = await jsonFetch('/api/admin/catalog/provider-categories', 'POST', categoryData);
    return ok
      ? { success: true, category: data.category }
      : { success: false, message: data.error };
  } catch (err) {
    return { success: false, message: 'Connection error' };
  }
}

export async function deleteProviderCategory(id) {
  try {
    const { ok, data } = await apiFetch(`/api/admin/catalog/provider-categories/${id}`, { method: 'DELETE' });
    return ok
      ? { success: true, message: data?.message || 'Deleted' }
      : { success: false, message: data?.error || 'Failed to delete' };
  } catch (err) {
    return { success: false, message: 'Connection error' };
  }
}

