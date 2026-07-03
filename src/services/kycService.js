/**
 * KYC service.
 * Admin KYC review operations.
 */
import { apiFetch, jsonFetch } from './api';

export async function fetchPendingKyc() {
  try {
    const { ok, data } = await apiFetch('/api/admin/kyc/pending');
    if (ok) {
      return data.pending || [];
    }
    return [];
  } catch (err) {
    console.error('Error fetching pending KYC:', err);
    return [];
  }
}

export async function approveKyc(storeId) {
  try {
    const { ok } = await jsonFetch('/api/admin/kyc/approve', 'POST', { store_id: storeId });
    return ok;
  } catch (err) {
    console.error('Error approving KYC:', err);
    return false;
  }
}

export async function rejectKyc(storeId, reason) {
  try {
    const { ok } = await jsonFetch('/api/admin/kyc/reject', 'POST', { store_id: storeId, reason });
    return ok;
  } catch (err) {
    console.error('Error rejecting KYC:', err);
    return false;
  }
}
