/**
 * Authentication service.
 * Handles email/password login, Google login, and Google registration.
 */
import { apiFetch, jsonFetch } from './api';

export async function login(email, password) {
  const { ok, data } = await jsonFetch('/api/auth/login', 'POST', { email, password });

  if (ok) {
    if (data.status === 'pending' || data.status === 'rejected') {
      return {
        success: true,
        isStoreRequest: true,
        status: data.status,
        rejection_reason: data.rejection_reason,
        request: data.store_request,
      };
    }
    return { success: true, user: data.user, store: data.store };
  }

  return { success: false, message: data.message || 'Invalid credentials. Please try again.' };
}

export async function googleLogin(idToken) {
  const { ok, data } = await jsonFetch('/api/auth/google-login', 'POST', { idToken });

  if (ok) {
    if (data.status === 'requires_otp') {
      return { success: true, requiresOtp: true, message: data.message };
    }
    return { success: true, requiresOtp: false, user: data.user, store: data.store };
  }

  return { success: false, message: data.message || data.error || 'Google Login failed' };
}

export async function googleRegister(idToken, code) {
  const { ok, data } = await jsonFetch('/api/auth/google-register', 'POST', { idToken, code });

  if (ok) {
    return { success: true, user: data.user };
  }

  return { success: false, message: data.error || data.message || 'Google Registration failed' };
}
