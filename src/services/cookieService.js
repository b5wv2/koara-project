/**
 * Utility service for managing frontend-accessible cookies (e.g. Consent).
 * Note: Authentication cookies are HttpOnly and cannot be accessed via this service.
 */

export const cookieService = {
  getCookie: (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  },

  setCookie: (name, value, days = 365) => {
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = `; expires=${date.toUTCString()}`;
    }
    // Set Secure and SameSite=None to align with cross-origin policies if needed, 
    // though consent cookies are usually just read on the frontend.
    document.cookie = `${name}=${value || ''}${expires}; path=/; SameSite=Lax; Secure`;
  },

  deleteCookie: (name) => {
    document.cookie = `${name}=; Max-Age=-99999999; path=/`;
  },

  hasConsent: () => {
    return cookieService.getCookie('koara_cookie_consent') === 'accepted';
  },

  getConsentDecision: () => {
    return cookieService.getCookie('koara_cookie_consent'); // 'accepted' | 'rejected' | null
  },

  setConsent: (decision) => {
    // decision should be 'accepted' or 'rejected'
    cookieService.setCookie('koara_cookie_consent', decision, 365);
  }
};
