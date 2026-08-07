import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import OTPInput from './OTPInput';
import DashButton from './ui/DashButton';
import { useAppContext } from '../context/AppContext';
import { useAsyncAction } from '../hooks/useAsyncAction';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const PasswordResetModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [globalLockUntil, setGlobalLockUntil] = useState(null);
  const [lockCountdown, setLockCountdown] = useState('');

  const { t } = useAppContext();
  const { execute, loading } = useAsyncAction();

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
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

  const handleRequestCode = (e) => execute(async () => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !email.trim()) {
      setErrorMsg(t('err_enter_email') || 'Please enter a valid email address.');
      return { success: false };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      
      if (!response.ok || data.success === false) {
        if (data.blocked_until) {
          setGlobalLockUntil(data.blocked_until);
        }
        throw new Error(data.error || data.message || t('err_failed_request_code'));
      }
      
      setStep(2);
      setCooldown(60);
      setSuccessMsg(data.message || t('success_code_sent'));
      return { success: true };
    } catch (err) {
      setErrorMsg(err.message);
      return { success: false, error: err.message };
    }
  });

  const handleResendCode = () => execute(async () => {
    if (cooldown > 0 || loading) return { success: false };
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      
      if (!response.ok || data.success === false) {
        if (data.blocked_until) {
          setGlobalLockUntil(data.blocked_until);
        }
        throw new Error(data.error || data.message || t('err_failed_resend'));
      }
      
      setCooldown(60);
      setSuccessMsg(t('success_new_code') || 'A new code has been sent.');
      return { success: true };
    } catch (err) {
      setErrorMsg(err.message);
      return { success: false, error: err.message };
    }
  });

  const handleVerifyCode = (completedCode) => execute(async () => {
    const codeToVerify = typeof completedCode === 'string' ? completedCode : code;
    
    if (!codeToVerify || codeToVerify.length < 6) {
      setOtpError(true);
      return { success: false };
    }
    
    setErrorMsg('');
    setOtpError(false);
    
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
      setOtpError(true);
      setCode('');
      return { success: false, error: err.message };
    }
  });

  const handleResetPassword = (e) => execute(async () => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!password || password.length < 8) {
      setErrorMsg(t('err_pass_length') || 'Password must be at least 8 characters long.');
      return { success: false };
    }
    if (password !== confirmPassword) {
      setErrorMsg(t('err_pass_mismatch') || 'Passwords do not match.');
      return { success: false };
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), code: code.trim(), password }),
    });
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error || t('err_failed_reset'));
    
    setStep(4);
    return { success: true };
  });

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
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">{t('reset_password_title')}</h3>
            <p className="text-sm text-slate-400">{t('enter_email_desc')}</p>
          </div>
          <div>
            <label className="koara-label">{t('email_address')}</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com" 
              className="koara-input" 
              required
            />
          </div>
          {globalLockUntil && (
            <div className="koara-error-msg text-center mt-4">
              {t('verification_locked')} {lockCountdown}
            </div>
          )}
          <DashButton
            loading={loading}
            onClick={handleRequestCode}
            disabled={loading || !!globalLockUntil}
            type="submit"
            className="dash-btn dash-btn-primary w-full justify-center py-2.5 text-sm font-semibold rounded-xl mt-4"
          >
            {t('send_verification_code')}
          </DashButton>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">{t('verification_code')}</h3>
            <p className="text-sm text-slate-400">
              {t('enter_code_sent_to')} <span className="text-white font-medium">{email}</span>.
            </p>
          </div>
          <div>
            <label className="koara-label text-center block mb-4">{t('verification_code')}</label>
            <OTPInput 
              length={6}
              value={code}
              onChange={(val) => { setCode(val); setOtpError(false); }}
              onComplete={(completedCode) => handleVerifyCode(completedCode)}
              disabled={loading}
              hasError={otpError}
            />
            {otpError && (
              <p className="text-red-500 text-sm mt-3 text-center font-medium animate-fade-in">
                The verification code is invalid or has expired.
              </p>
            )}
          </div>
          {globalLockUntil && (
            <div className="koara-error-msg text-center mt-4">
              {t('verification_locked')} {lockCountdown}
            </div>
          )}
          <DashButton 
            loading={loading}
            onClick={() => handleVerifyCode()}
            disabled={loading || code.length < 6 || !!globalLockUntil} 
            type="button" 
            className="dash-btn dash-btn-primary w-full justify-center py-2.5 text-sm font-semibold rounded-xl mt-6"
          >
            {t('verify_code')}
          </DashButton>
          
          <div className="mt-4 text-center">
            <DashButton
              type="button" 
              loading={loading}
              onClick={handleResendCode}
              disabled={cooldown > 0 || loading || !!globalLockUntil}
              className="text-sm text-koara-blue hover:underline disabled:text-slate-400 disabled:no-underline font-medium bg-transparent border-none"
            >
              {cooldown > 0 ? `${t('resend_available_in')} ${cooldown}s` : t('resend_code')}
            </DashButton>
          </div>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">{t('new_password')}</h3>
            <p className="text-sm text-slate-400">{t('enter_new_password')}</p>
          </div>
          <div>
            <label className="koara-label">{t('new_password')}</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="koara-input" 
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="koara-label">{t('confirm_password')}</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••" 
              className="koara-input" 
              required
              minLength={8}
            />
          </div>
          <DashButton
            loading={loading}
            onClick={handleResetPassword}
            disabled={loading}
            type="submit"
            className="dash-btn dash-btn-primary w-full justify-center py-2.5 text-sm font-semibold rounded-xl mt-4"
          >
            {t('reset_password_btn')}
          </DashButton>
        </form>
      )}

      {step === 4 && (
        <div className="text-center py-10 animate-fade-in space-y-6">
          <div className="mx-auto mb-6 flex justify-center">
            <div className="koara-success-animation">
              <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">{t('password_reset_success')}</h2>
          <p className="text-slate-400 max-w-sm mx-auto leading-relaxed">
            {t('login_with_new')}
          </p>
          <div className="pt-4 max-w-xs mx-auto">
            <DashButton onClick={() => { resetState(); onClose(); }} className="dash-btn dash-btn-primary w-full justify-center py-3 font-semibold rounded-xl cursor-pointer">
              {t('close')}
            </DashButton>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default PasswordResetModal;
