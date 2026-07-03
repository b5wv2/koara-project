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
    const { ok, data } = await apiFetch('/api/admin/catalog/providers');
    if (ok) {
      return data.providers || [];
    }
    return [];
  } catch (err) {
    console.error('Error fetching providers:', err);
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
