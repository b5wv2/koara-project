/**
 * Resolves an image URL against the API backend domain.
 * This ensures that uploaded images (which have relative paths like /uploads/...)
 * are loaded from the backend API, not the frontend website domain.
 */
export function getImageUrl(path) {
  if (!path) return null;
  
  // If it's already an absolute URL or a data URI, return as-is
  if (path.startsWith('http') || path.startsWith('data:')) {
    return path;
  }
  
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  
  // Ensure we don't double-slash if API_BASE_URL ends with / and path starts with /
  const cleanBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${cleanBase}${cleanPath}`;
}
