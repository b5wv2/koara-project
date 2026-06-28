import React, { useState } from 'react';
import Modal from './Modal';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Eye, EyeOff, LogIn, ArrowLeft, Mail } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import OTPInput from './OTPInput';

const LoginModal = ({ isOpen, onClose, onStoreStatus, onForgot }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [cachedIdToken, setCachedIdToken] = useState(null);
  const [otpValue, setOtpValue] = useState('');
  
  const navigate = useNavigate();
  const { login, googleLogin, googleRegister, t } = useAppContext();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      if (result.isStoreRequest) {
        onStoreStatus({ status: result.status, reason: result.rejection_reason, request: result.request });
        onClose();
        return;
      }
      onClose();
      setEmail('');
      setPassword('');
      navigate('/admin');
    } else {
      setError(result.message);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);

    try {
      const result = await googleLogin(credentialResponse.credential);
      setLoading(false);
      
      if (result.success) {
        if (result.requiresOtp) {
          setCachedIdToken(credentialResponse.credential);
          setIsOtpStep(true);
          return;
        }

        if (result.isStoreRequest) {
          onStoreStatus({ status: result.status, reason: result.rejection_reason, request: result.request });
          onClose();
          return;
        }
        
        onClose();
        setEmail('');
        setPassword('');
        navigate('/admin');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setLoading(false);
      console.error(err);
      setError('An unexpected error occurred during Google Login.');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpValue.length < 6) {
      setError('Please enter the complete verification code.');
      return;
    }

    setError('');
    setLoading(true);
    
    try {
      const result = await googleRegister(cachedIdToken, otpValue);
      setLoading(false);

      if (result.success) {
        setIsOtpStep(false);
        setCachedIdToken(null);
        setOtpValue('');
        onClose();
        navigate('/admin');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setLoading(false);
      console.error(err);
      setError('An unexpected error occurred during verification.');
    }
  };

  if (isOtpStep) {
    return (
      <Modal isOpen={isOpen} onClose={() => { setIsOtpStep(false); onClose(); }} title="Verify Your Account">
        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <button
            type="button"
            onClick={() => setIsOtpStep(false)}
            className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Sign In
          </button>

          {error && (
            <div className="koara-error-msg">
              {error}
            </div>
          )}

          <div className="text-center">
            <div className="w-14 h-14 bg-koara-accent/10 text-koara-accent rounded-full flex items-center justify-center mx-auto mb-4 border border-koara-accent/20">
              <Mail size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Check Your Email</h3>
            <p className="text-sm text-slate-400">
              We've sent a 6-digit verification code to your Google email. Enter it below to complete registration.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <OTPInput
              length={6}
              value={otpValue}
              onChange={(val) => setOtpValue(val)}
              onComplete={(val) => {
                setOtpValue(val);
                // We could auto-submit here
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || otpValue.length < 6}
            className="dash-btn dash-btn-primary w-full justify-center py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify & Create Account'
            )}
          </button>
        </form>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('sign_in_account')}>
      <form onSubmit={handleLogin} className="space-y-5">
        {error && (
          <div className="koara-error-msg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="koara-label">{t('email_address')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="koara-input"
              required
              dir="ltr"
            />
          </div>
          <div>
            <label className="koara-label">{t('password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="koara-input pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onClose(); if (onForgot) onForgot(); }}
                className="text-xs font-medium text-koara-accent hover:text-koara-blue-light transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="dash-btn dash-btn-primary w-full justify-center py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <LogIn size={15} />
              {t('signin')}
            </>
          )}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-[#0b0c10] px-2 text-slate-400">Or continue with</span>
          </div>
        </div>

        <div className="flex justify-center w-full">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              setError('Google Login failed. Please try again.');
            }}
            theme="filled_black"
            text="continue_with"
            shape="rectangular"
          />
        </div>

        <div className="pt-4 border-t border-white/6">
          <p className="text-xs font-semibold text-slate-500 mb-2">Test Credentials</p>
          <div className="space-y-1.5 text-xs font-mono text-slate-600" dir="ltr">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/3 border border-white/5">
              <span className="text-koara-accent font-bold">Admin:</span>
              <span>admin@gmil.com / admin1234</span>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default LoginModal;
