/**
 * Store management service.
 * Admin-level store CRUD and status operations.
 */
import { apiFetch, jsonFetch } from './api';

export async function fetchAllStoresAdmin() {
  try {
    const { ok, data } = await apiFetch('/api/admin/stores');
    if (ok) {
      return { success: true, stores: data.stores || data || [] };
    }
    return { success: false, stores: [] };
  } catch (err) {
    console.error('Error fetching all stores:', err);
    return { success: false, stores: [] };
  }
}

export async function deleteStore(id) {
  try {
    const { ok, data } = await apiFetch(`/api/admin/stores/${id}`, { method: 'DELETE' });
    if (ok) {
      return { success: true };
    }
    return { success: false, message: data.error || 'Failed to delete store.' };
  } catch (err) {
    console.error('Error deleting store:', err);
    return { success: false, message: 'Connection error' };
  }
}

export async function toggleStoreActive(storeId, newStatus) {
  try {
    const { ok, data } = await jsonFetch(`/api/admin/stores/${storeId}/status`, 'POST', { status: newStatus });
    if (ok) {
      return { success: true };
    }
    return { success: false, message: data.error || 'Failed to update store status' };
  } catch (err) {
    console.error('Error toggling store status:', err);
    return { success: false, message: 'Connection error' };
  }
}
