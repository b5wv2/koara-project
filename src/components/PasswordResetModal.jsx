import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import OTPInput from './OTPInput';
import { useAppContext } from '../context/AppContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

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
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter your email.');
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
        throw new Error(data.error || 'Failed to request reset code.');
      }
      
      setStep(2);
      setCooldown(60);
      setSuccessMsg(data.message || 'Reset code sent to your email.');
    } catch (err) {
      setErrorMsg(err.message);
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
        throw new Error(data.error || 'Failed to resend code.');
      }
      
      setCooldown(60);
      setSuccessMsg('A new code has been sent.');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (codeFromParam) => {
    const codeToVerify = typeof codeFromParam === 'string' ? codeFromParam : code;
    if (!codeToVerify || codeToVerify.length < 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
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
        throw new Error(data.error || 'Invalid or expired code.');
      }
      
      setStep(3);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
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
      
      if (!response.ok) throw new Error(data.error || 'Failed to reset password.');
      
      setStep(4);
    } catch (err) {
      setErrorMsg(err.message);
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
    <Modal isOpen={isOpen} onClose={() => { resetState(); onClose(); }} title="Reset Password">
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
          <p className="text-sm text-slate-500 mb-2">Enter your email address to receive a 6-digit reset code.</p>
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
              Verification locked. Try again in {lockCountdown}
            </div>
          )}
          <button disabled={loading || !!globalLockUntil} type="submit" className="w-full mt-4 bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50">
            {loading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 mb-2">Enter the 6-digit code sent to <strong>{email}</strong>.</p>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-4 text-center">Verification Code</label>
            <OTPInput 
              length={6}
              value={code}
              onChange={setCode}
              onComplete={(completedCode) => handleVerifyCode(completedCode)}
            />
          </div>
          {globalLockUntil && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-lg mt-4 text-center">
              Verification locked. Try again in {lockCountdown}
            </div>
          )}
          <button 
            onClick={() => handleVerifyCode()}
            disabled={loading || code.length < 6 || !!globalLockUntil} 
            type="button" 
            className="w-full mt-6 bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
          
          <div className="mt-4 text-center">
            <button 
              type="button" 
              onClick={handleResendCode}
              disabled={cooldown > 0 || loading || !!globalLockUntil}
              className="text-sm text-koara-blue hover:underline disabled:text-slate-400 disabled:no-underline font-medium"
            >
              {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend Code'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-slate-500 mb-2">Please enter your new password.</p>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">New Password</label>
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
            <label className="block text-xs font-medium text-slate-700 mb-1">Confirm Password</label>
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
          <button disabled={loading} type="submit" className="w-full mt-4 bg-koara-blue text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}

      {step === 4 && (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h4 className="text-xl font-semibold mb-2 text-black">Password Reset Successfully</h4>
          <p className="text-sm text-slate-500 mb-8">
            You can now log in with your new password.
          </p>
          <button onClick={() => { resetState(); onClose(); }} className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors cursor-pointer">
            Close
          </button>
        </div>
      )}
    </Modal>
  );
};

export default PasswordResetModal;
