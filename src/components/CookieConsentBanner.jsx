import React from 'react';
import { useCookieConsent } from '../hooks/useCookieConsent';

const CookieConsentBanner = () => {
  const { decision, acceptCookies, rejectCookies } = useCookieConsent();

  // If a decision has already been made, do not render the banner
  if (decision !== null) {
    return null;
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.banner}>
        <div style={styles.content}>
          <h3 style={styles.heading}>Cookie Preferences</h3>
          <p style={styles.text}>
            We use cookies to improve your experience, keep you signed in, and enhance platform functionality.
          </p>
        </div>
        <div style={styles.actions}>
          <button style={styles.acceptButton} onClick={acceptCookies}>
            Accept Cookies
          </button>
          <button style={styles.rejectButton} onClick={rejectCookies}>
            Reject Non-Essential Cookies
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    bottom: '20px',
    left: '20px',
    right: '20px',
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  banner: {
    pointerEvents: 'auto',
    backgroundColor: '#ffffff',
    color: '#333333',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: '1000px',
    width: '100%',
    border: '1px solid #e0e0e0',
    gap: '24px',
    flexWrap: 'wrap',
  },
  content: {
    flex: '1 1 300px',
  },
  heading: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
  },
  text: {
    margin: '0',
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#4B5563',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    flex: '0 0 auto',
  },
  acceptButton: {
    backgroundColor: '#2563EB',
    color: '#ffffff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  rejectButton: {
    backgroundColor: '#F3F4F6',
    color: '#374151',
    border: '1px solid #D1D5DB',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  }
};

export default CookieConsentBanner;
