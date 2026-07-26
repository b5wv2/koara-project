import React, { useState } from 'react';
import Modal from './Modal';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import DashButton from './ui/DashButton';
import { useAsyncAction } from '../hooks/useAsyncAction';

const LoginModal = ({ isOpen, onClose, onStoreStatus, onForgot, onGoogleOnboarding }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { login, googleLogin, t } = useAppContext();
  const { execute, loading } = useAsyncAction();

  const handleLogin = (e) => execute(async () => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');

    const result = await login(email, password);
    if (result.success) {
      if (result.isStoreRequest) {
        onStoreStatus({ status: result.status, reason: result.rejection_reason, request: result.request });
        onClose();
        return result;
      }
      onClose();
      setEmail('');
      setPassword('');
      navigate('/admin');
    } else {
      setError(result.message);
    }
    return result;
  });

  const handleGoogleSuccess = (credentialResponse) => execute(async () => {
    setError('');

    const result = await googleLogin(credentialResponse.credential);
    
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
  });

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
              placeholder="name@example.com"
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
                className="koara-input pe-11"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
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
                {t('forgot_password')}
              </button>
            </div>
          </div>
        </div>

        <DashButton
          type="submit"
          onClick={handleLogin}
          loading={loading}
          disabled={loading}
          className="dash-btn dash-btn-primary w-full justify-center py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogIn size={16} />
          {t('sign_in')}
        </DashButton>
      </form>
    </Modal>
  );
};

export default LoginModal;
