/**
 * Central API configuration.
 * Single source of truth for the API base URL and shared fetch helper.
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Thin wrapper around fetch() that:
 *  - Prepends the API base URL
 *  - Parses JSON automatically
 *  - Returns { ok, status, data } for uniform handling
 */
export async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;

  const fetchOptions = {
    credentials: 'include', // Automatically send cookies
    ...options,
  };

  const response = await fetch(url, fetchOptions);
  const data = await response.json();

  return { ok: response.ok, status: response.status, data };
}

/**
 * Convenience for JSON POST/PUT/DELETE requests.
 */
export function jsonFetch(path, method, body) {
  return apiFetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
