import React, { useState } from 'react';
import Modal from './Modal';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Eye, EyeOff, LogIn, ArrowLeft, Mail } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import OTPInput from './OTPInput';

const LoginModal = ({ isOpen, onClose, onStoreStatus, onForgot, onGoogleOnboarding }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login, googleLogin, t } = useAppContext();

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
        if (result.requires_onboarding) {
          onClose();
          if (onGoogleOnboarding) onGoogleOnboarding(result.email);
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

        {/* Temporarily hidden Google Login
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
        */}

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
