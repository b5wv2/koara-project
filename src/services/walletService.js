/**
 * Wallet / transaction service.
 * Admin credit/debit operations and transaction history.
 */
import { apiFetch, jsonFetch } from './api';

export async function adminAddCredit(storeId, amount, reason) {
  try {
    const { ok, data } = await jsonFetch(`/api/admin/stores/${storeId}/add-credit`, 'POST', { amount, reason });
    if (ok) {
      return { success: true, balance: parseFloat(data.balance) };
    }
    return { success: false, message: data.error };
  } catch (err) {
    console.error('Error adding credit:', err);
    return { success: false, message: 'Connection error' };
  }
}

export async function adminDeduct(storeId, amount, reason) {
  try {
    const { ok, data } = await jsonFetch(`/api/admin/stores/${storeId}/deduct`, 'POST', { amount, reason });
    if (ok) {
      return { success: true, balance: parseFloat(data.balance) };
    }
    return { success: false, message: data.error };
  } catch (err) {
    console.error('Error deducting credit:', err);
    return { success: false, message: 'Connection error' };
  }
}

export async function fetchTransactions(storeId) {
  try {
    const { ok, data } = await apiFetch(`/api/admin/stores/${storeId}/transactions`);
    if (ok) {
      return data.transactions || [];
    }
    return [];
  } catch (err) {
    console.error('Error fetching transactions:', err);
    return [];
  }
}

export async function fetchGlobalTransactions() {
  try {
    const { ok, data } = await apiFetch('/api/admin/transactions');
    if (ok) {
      return data.transactions || [];
    }
    return [];
  } catch (err) {
    console.error('Error fetching global transactions:', err);
    return [];
  }
}
