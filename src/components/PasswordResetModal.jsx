import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import OTPInput from './OTPInput';
import DashButton from './ui/DashButton';
import { useAppContext } from '../context/AppContext';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const PasswordResetModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Resend cooldown
  const [cooldown, setCooldown] = useState(0);

  const [globalLockUntil, setGlobalLockUntil] = useState(null);
  const [lockCountdown, setLockCountdown] = useState('');

  const { t } = useAppContext();

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    let timer;
    if (globalLockUntil) {
      const updateTimer = () => {
        const now = new Date();
        const until = new Date(globalLockUntil);
        const diff = Math.floor((until - now) / 1000);
        if (diff <= 0) {
          setGlobalLockUntil(null);
          setLockCountdown('');
          clearInterval(timer);
        } else {
          const m = Math.floor(diff / 60);
          const s = diff % 60;
          setLockCountdown(`${m}:${s.toString().padStart(2, '0')}`);
        }
      };
      updateTimer();
      timer = setInterval(updateTimer, 1000);
    }
    return () => clearInterval(timer);
  }, [globalLockUntil]);

  const handleRequestCode = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!email) {
      setErrorMsg(t('err_enter_email'));
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        if (data.blocked_until) {
          setGlobalLockUntil(data.blocked_until);
        }
        throw new Error(data.error || t('err_failed_request_code'));
      }
      
      setStep(2);
      setCooldown(60);
      setSuccessMsg(data.message || t('success_code_sent'));
      return { success: true };
    } catch (err) {
      setErrorMsg(err.message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0) return;
    
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        if (data.blocked_until) {
          setGlobalLockUntil(data.blocked_until);
        }
        throw new Error(data.error || t('err_failed_resend'));
      }
      
      setCooldown(60);
      setSuccessMsg(t('success_new_code'));
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (codeFromParam) => {
    const codeToVerify = typeof codeFromParam === 'string' ? codeFromParam : code;
    if (!codeToVerify || codeToVerify.length < 6) {
      setErrorMsg(t('err_enter_6_digit'));
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: codeToVerify.trim() }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        if (data.blocked_until) {
          setGlobalLockUntil(data.blocked_until);
        }
        throw new Error(data.error || t('err_invalid_expired'));
      }
      
      setStep(3);
      return { success: true };
    } catch (err) {
      setErrorMsg(err.message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (password.length < 8) {
      setErrorMsg(t('err_pass_length'));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg(t('err_pass_mismatch'));
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim(), password }),
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || t('err_failed_reset'));
      
      setStep(4);
      return { success: true };
    } catch (err) {
      setErrorMsg(err.message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setStep(1);
    setEmail('');
    setCode('');
    setPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setSuccessMsg('');
    setCooldown(0);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { resetState(); onClose(); }} title={t('reset_password_title')}>
      {errorMsg && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 mb-4">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100 mb-4">
          {successMsg}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <p className="text-sm text-slate-500 mb-2">{t('enter_email_desc')}</p>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{t('email_address')}</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com" 
              className="w-full px-3 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-koara-blue focus:ring-1 focus:ring-koara-blue" 
              required
            />
          </div>
          {globalLockUntil && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-lg mt-4 text-center">
              {t('verification_locked')} {lockCountdown}
            </div>
          )}
          <DashButton onClick={handleRequestCode} disabled={loading || !!globalLockUntil} type="submit" className="dash-btn dash-btn-primary w-full mt-4 bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50">
            {t('send_verification_code')}
          </DashButton>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 mb-2">{t('enter_code_sent_to')} <strong>{email}</strong>.</p>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-4 text-center">{t('verification_code')}</label>
            <OTPInput 
              length={6}
              value={code}
              onChange={setCode}
              onComplete={(completedCode) => handleVerifyCode(completedCode)}
            />
          </div>
          {globalLockUntil && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-lg mt-4 text-center">
              {t('verification_locked')} {lockCountdown}
            </div>
          )}
          <DashButton 
            onClick={() => handleVerifyCode()}
            disabled={loading || code.length < 6 || !!globalLockUntil} 
            type="button" 
            className="dash-btn dash-btn-primary w-full mt-6 bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {t('verify_code')}
          </DashButton>
          
          <div className="mt-4 text-center">
            <button 
              type="button" 
              onClick={handleResendCode}
              disabled={cooldown > 0 || loading || !!globalLockUntil}
              className="text-sm text-koara-blue hover:underline disabled:text-slate-400 disabled:no-underline font-medium"
            >
              {cooldown > 0 ? `${t('resend_available_in')} ${cooldown}s` : t('resend_code')}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-slate-500 mb-2">{t('enter_new_password')}</p>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{t('new_password')}</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full px-3 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-koara-blue focus:ring-1 focus:ring-koara-blue" 
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{t('confirm_password')}</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full px-3 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-koara-blue focus:ring-1 focus:ring-koara-blue" 
              required
              minLength={8}
            />
          </div>
          <DashButton onClick={handleResetPassword} disabled={loading} type="submit" className="dash-btn dash-btn-primary w-full mt-4 bg-koara-blue text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
            {t('reset_password_btn')}
          </DashButton>
        </form>
      )}

      {step === 4 && (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h4 className="text-xl font-semibold mb-2 text-black">{t('password_reset_success')}</h4>
          <p className="text-sm text-slate-500 mb-8">
            {t('login_with_new')}
          </p>
          <button onClick={() => { resetState(); onClose(); }} className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors cursor-pointer">
            {t('close')}
          </button>
        </div>
      )}
    </Modal>
  );
};

export default PasswordResetModal;
