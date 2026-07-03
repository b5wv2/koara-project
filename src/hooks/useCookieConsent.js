import { useState, useEffect } from 'react';
import { cookieService } from '../services/cookieService';

export const useCookieConsent = () => {
  const [decision, setDecision] = useState(null);

  useEffect(() => {
    const currentDecision = cookieService.getConsentDecision();
    setDecision(currentDecision);
  }, []);

  const acceptCookies = () => {
    cookieService.setConsent('accepted');
    setDecision('accepted');
  };

  const rejectCookies = () => {
    cookieService.setConsent('rejected');
    setDecision('rejected');
  };

  return { decision, acceptCookies, rejectCookies };
};
