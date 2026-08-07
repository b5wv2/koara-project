import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import OTPInput from './OTPInput';
import { UploadCloud, CheckCircle2, ArrowRight, ArrowLeft, Building2, User, ShieldCheck, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import DashButton from './ui/DashButton';
import { useAsyncAction } from '../hooks/useAsyncAction';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const stepsList = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Verify' },
  { id: 3, label: 'Store Info' },
  { id: 4, label: 'Bank Info' },
  { id: 5, label: 'KYC & Review' },
];

const StepIndicator = ({ current }) => (
  <div className="flex items-center justify-between mb-8 px-2 mt-2">
    {stepsList.map((step, index) => {
      const isCompleted = step.id < current;
      const isActive = step.id === current;
      
      return (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center relative z-10 w-16">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 mb-2
                ${isActive ? 'bg-koara-primary text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] scale-110' : 
                  isCompleted ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)] scale-100' : 
                  'bg-slate-800 text-slate-500'}`}
            >
              {isCompleted ? (
                <div className="relative flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 52 52">
                    <circle className="stroke-white stroke-[4] fill-none animate-[koara-stroke_0.4s_ease-out_forwards] [stroke-dasharray:166] [stroke-dashoffset:166]" cx="26" cy="26" r="25" />
                    <path className="stroke-white stroke-[4] fill-none animate-[koara-stroke_0.3s_ease-out_0.2s_forwards] [stroke-dasharray:48] [stroke-dashoffset:48]" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                  </svg>
                </div>
              ) : (
                step.id
              )}
            </div>
            <span className={`text-[10px] sm:text-xs font-medium text-center transition-colors duration-300 ${isActive ? 'text-white' : isCompleted ? 'text-green-400' : 'text-slate-500'}`}>
              {step.label}
            </span>
          </div>
          
          {index < stepsList.length - 1 && (
            <div className="flex-1 h-px mx-1 sm:mx-2 -mt-6">
              <div 
                className="h-full transition-all duration-500"
                style={{ 
                  background: step.id < current ? '#22c55e' : '#1e293b',
                  width: '100%'
                }}
              />
            </div>
          )}
        </React.Fragment>
      );
    })}
  </div>
);

const OnboardingModal = ({ isOpen, onClose, initialData }) => {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const { t } = useAppContext();

  const { execute, loading } = useAsyncAction();

  // Onboarding Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainStatus, setSubdomainStatus] = useState(''); // 'checking', 'available', 'unavailable'
  const [subdomainError, setSubdomainError] = useState('');

  // Bank Information States
  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bban, setBban] = useState('');
  const [iban, setIban] = useState('');

  // KYC Document
  const [kycDocument, setKycDocument] = useState(null);
  const [invitationCode, setInvitationCode] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [globalLockUntil, setGlobalLockUntil] = useState(null);
  const [lockCountdown, setLockCountdown] = useState('');

  useEffect(() => {
    if (isOpen && initialData?.isGoogleAuth) {
      setEmail(initialData.email);
      const randomPassword = crypto.randomUUID 
        ? crypto.randomUUID() 
        : Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      setPassword(randomPassword);
      setStep(2);
    } else if (!isOpen) {
      setStep(1);
      setEmail('');
      setPassword('');
      setVerificationCode('');
      setFirstName('');
      setLastName('');
      setStoreName('');
      setSubdomain('');
      setBankName('');
      setAccountHolderName('');
      setAccountNumber('');
      setBban('');
      setIban('');
      setBban('');
      setIban('');
      setKycDocument(null);
      setInvitationCode('');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, initialData]);

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

  const handleSendRegistrationCode = () => execute(async () => {
    if (!email.trim() || !password) {
      setErrorMsg(t('err_enter_email_pass'));
      return { success: false };
    }
    setErrorMsg('');
    const response = await fetch(`${API_BASE_URL}/api/auth/send-registration-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await response.json();
    if (!response.ok) {
      if (data.blocked_until) {
        setGlobalLockUntil(data.blocked_until);
      }
      throw new Error(data.error || t('err_failed_send_code'));
    }

    setStep(2);
    setCooldown(60);
    setSuccessMsg(t('success_verify_code_sent'));
    return { success: true };
  });

  const handleVerifyRegistrationCode = (codeFromParam) => execute(async () => {
    const codeToVerify = typeof codeFromParam === 'string' ? codeFromParam : verificationCode;
    if (!codeToVerify || codeToVerify.length < 6) {
      setOtpError(true);
      return { success: false };
    }
    setErrorMsg('');
    setOtpError(false);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-registration-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: codeToVerify.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.blocked_until) {
          setGlobalLockUntil(data.blocked_until);
        }
        throw new Error(data.error || t('err_invalid_code'));
      }
      setSuccessMsg('');
      setStep(3);
      return { success: true };
    } catch (err) {
      setOtpError(true);
      setVerificationCode('');
      return { success: false, error: err.message };
    }
  });

  const handleResendCode = () => execute(async () => {
    if (cooldown > 0 || loading) return { success: false };
    setErrorMsg('');
    setSuccessMsg('');
    const response = await fetch(`${API_BASE_URL}/api/auth/send-registration-code`, {
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
    setSuccessMsg(t('success_new_verify_code'));
    return { success: true };
  });

  const handleNext = () => {
    setErrorMsg('');
    if (step === 3) {
      if (!firstName.trim() || !lastName.trim() || !storeName.trim() || !subdomain.trim()) {
        setErrorMsg(t('err_req_store_fields'));
        return;
      }
      if (subdomainStatus === 'checking' || subdomainStatus === 'invalid' || subdomainStatus === 'unavailable') {
        setErrorMsg(subdomainError || t('err_subdomain_unavailable'));
        return;
      }
    } else if (step === 4) {
      if (!bankName.trim() || !accountHolderName.trim() || !accountNumber.trim()) {
        setErrorMsg(t('err_req_bank_fields'));
        return;
      }
    }
    setStep(s => s + 1);
  };

  const handleStoreNameChange = (val) => {
    setStoreName(val);
    if (!subdomain) {
      const slug = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/(^-|-$)/g, '');
      if (slug.length >= 3) {
        handleSubdomainChange(slug);
      }
    }
  };

  const handleSubdomainChange = (val) => {
    const rawVal = val.toLowerCase();
    setSubdomain(rawVal);

    if (/[^a-z0-9-]/.test(rawVal)) {
      setSubdomainStatus('invalid');
      setSubdomainError('Only English letters, numbers, and hyphens are allowed.');
      return;
    }
    if (rawVal.includes('--')) {
      setSubdomainStatus('invalid');
      setSubdomainError('Consecutive hyphens are not allowed.');
      return;
    }
    if (rawVal.startsWith('-')) {
      setSubdomainStatus('invalid');
      setSubdomainError('Cannot start with a hyphen.');
      return;
    }
    if (rawVal.endsWith('-')) {
      setSubdomainStatus('invalid');
      setSubdomainError('Cannot end with a hyphen.');
      return;
    }
    if (rawVal.length > 50) {
      setSubdomainStatus('invalid');
      setSubdomainError('Maximum length is 50 characters.');
      return;
    }
    if (rawVal.length < 3) {
      setSubdomainStatus('invalid');
      setSubdomainError('Minimum length is 3 characters.');
      return;
    }

    setSubdomainStatus('checking');
    setSubdomainError('');
    checkSubdomainDebounced(rawVal);
  };

  const checkSubdomainDebounced = (cleanVal) => execute(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/store/check-subdomain/${cleanVal}`);
      const data = await response.json();
      if (data.available) {
        setSubdomainStatus('available');
      } else {
        setSubdomainStatus('unavailable');
        setSubdomainError(data.error || t('err_subdomain_unavailable'));
      }
    } catch (err) {
      setSubdomainStatus('unavailable');
      setSubdomainError(t('err_check_avail_failed'));
    }
  });

  const handleSubmit = (e) => execute(async () => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');

    if (!kycDocument && !invitationCode.trim()) {
      setErrorMsg(t('err_req_kyc'));
      return { success: false };
    }

    const formData = new FormData();
    formData.append('name', `${firstName.trim()} ${lastName.trim()}`);
    formData.append('email', email.trim());
    formData.append('password', password);
    formData.append('store_name', storeName.trim());
    formData.append('subdomain', subdomain.trim());
    formData.append('bank_name', bankName.trim());
    formData.append('account_holder_name', accountHolderName.trim());
    formData.append('account_number', accountNumber.trim());
    if (bban.trim()) formData.append('bban', bban.trim());
    if (iban.trim()) formData.append('iban', iban.trim());
    if (kycDocument) {
      formData.append('kyc_document', kycDocument);
    }
    if (invitationCode.trim()) {
      formData.append('invitation_code', invitationCode.trim());
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || t('err_init_onboarding'));
    }

    setStep(6);
    return { success: true };
  });

  const resetStateAndClose = () => {
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetStateAndClose}
      title={step === 6 ? t('modal_title_complete') : t('create store')}
    >
      {step < 6 && <StepIndicator current={step} />}

      {errorMsg && (
        <div className="koara-error-msg mb-4">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold rounded-lg mb-4">
          {successMsg}
        </div>
      )}

      {/* ── Step 1: Account Creation ── */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Create Account</h3>
            <p className="text-sm text-slate-400">{t('desc_enter_email_pass') || 'Enter your details to get started'}</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="koara-label">{t('email_address')}</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="merchant@example.com"
                className="koara-input"
                dir="ltr"
              />
            </div>
            <div>
              <label className="koara-label">{t('password')}</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="koara-input"
              />
            </div>
          </div>
          {globalLockUntil && (
            <div className="koara-error-msg text-center">
              {t('verification_locked')} {lockCountdown}
            </div>
          )}
          <DashButton
            onClick={handleSendRegistrationCode}
            loading={loading}
            disabled={loading || !!globalLockUntil}
            className="dash-btn dash-btn-primary w-full justify-center py-2.5 text-sm font-semibold rounded-xl mt-4"
          >
            {t('continue')} <ArrowRight size={14} />
          </DashButton>
        </div>
      )}

      {/* ── Step 2: Verify Email ── */}
      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Verify Email</h3>
            <p className="text-sm text-slate-400">
              {t('desc_enter_6_digit_code')} <span className="text-white font-medium">{email}</span>.
            </p>
          </div>
          <div>
            <label className="koara-label text-center block mb-4">{t('verification_code')}</label>
            <OTPInput
              length={6}
              value={verificationCode}
              onChange={(val) => { setVerificationCode(val); setOtpError(false); }}
              onComplete={(code) => handleVerifyRegistrationCode(code)}
              disabled={loading}
              hasError={otpError}
            />
            {otpError && (
              <p className="text-red-500 text-sm mt-3 text-center font-medium animate-fade-in">
                Incorrect verification code. Please try again.
              </p>
            )}
          </div>
          {globalLockUntil && (
            <div className="koara-error-msg text-center">
              {t('verification_locked')} {lockCountdown}
            </div>
          )}
          <DashButton
            onClick={() => handleVerifyRegistrationCode()}
            loading={loading}
            disabled={loading || verificationCode.length < 6 || !!globalLockUntil}
            className="dash-btn dash-btn-primary w-full justify-center py-2.5 text-sm font-semibold rounded-xl mt-2"
          >
            {t('step_verify')}
          </DashButton>
          <div className="text-center">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={cooldown > 0 || loading || !!globalLockUntil}
              className="text-sm text-koara-accent hover:underline disabled:text-slate-600 disabled:no-underline font-medium transition-colors"
            >
              {cooldown > 0 ? `${t('resend_available_in')} ${cooldown}s` : t('resend_code')}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Store Info ── */}
      {step === 3 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Store Information</h3>
            <p className="text-sm text-slate-400">{t('desc_tell_us_store')}</p>
          </div>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="koara-label">{t('first_name')}</label>
                <input required type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" className="koara-input" />
              </div>
              <div className="flex-1">
                <label className="koara-label">{t('last_name')}</label>
                <input required type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className="koara-input" />
              </div>
            </div>
            <div>
              <label className="koara-label">{t('store_name')}</label>
              <input required type="text" value={storeName} onChange={(e) => handleStoreNameChange(e.target.value)} placeholder="Acme Digital" className="koara-input" />
            </div>
            <div>
              <label className="koara-label">{t('store_subdomain')}</label>
              <div className="flex" dir="ltr">
                <input
                  required type="text"
                  value={subdomain}
                  onChange={(e) => handleSubdomainChange(e.target.value)}
                  placeholder="acme"
                  className={`koara-input rounded-e-none border-e-0 flex-1 ${
                    subdomainStatus === 'unavailable' ? 'border-red-500/50 focus:border-red-500' :
                    subdomainStatus === 'available' ? 'border-green-500/50 focus:border-green-500' : ''
                  }`}
                />
                <span className="inline-flex items-center px-3 border border-white/10 border-s-0 bg-white/5 text-slate-500 text-sm rounded-r-[10px] whitespace-nowrap">
                  .getkoara.com
                </span>
              </div>
              {subdomainStatus === 'checking' && <p className="text-xs text-slate-500 mt-1.5">{t('checking_availability')}</p>}
              {subdomainStatus === 'available' && <p className="text-xs text-green-500 font-medium mt-1.5">{t('subdomain_available')}</p>}
              {subdomainStatus === 'unavailable' && <p className="text-xs text-red-400 font-medium mt-1.5">✗ {subdomainError}</p>}
            </div>
          </div>
          <button onClick={handleNext} className="dash-btn dash-btn-primary w-full justify-center py-2.5 text-sm font-semibold rounded-xl mt-2">
            {t('continue_to_bank_info')} <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ── Step 4: Bank Info ── */}
      {step === 4 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Bank Information</h3>
            <p className="text-sm text-slate-400">{t('desc_enter_bank')}</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="koara-label">{t('bank_name')}</label>
              <input required type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Chase Bank" className="koara-input" />
            </div>
            <div>
              <label className="koara-label">{t('account_holder_name')}</label>
              <input required type="text" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} placeholder="John Doe" className="koara-input" />
            </div>
            <div>
              <label className="koara-label">{t('account_number')}</label>
              <input required type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="1234567890" className="koara-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="koara-label">BBAN <span className="text-slate-500 font-normal">(Optional)</span></label>
                <input type="text" value={bban} onChange={(e) => setBban(e.target.value)} placeholder="000123" className="koara-input" dir="ltr" />
              </div>
              <div>
                <label className="koara-label">IBAN <span className="text-slate-500 font-normal">(Optional)</span></label>
                <input type="text" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="US123..." className="koara-input" dir="ltr" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="koara-label">BBAN <span className="text-slate-500 font-normal">(Optional)</span></label>
                <input type="text" value={bban} onChange={(e) => setBban(e.target.value)} placeholder="000123" className="koara-input" dir="ltr" />
              </div>
              <div>
                <label className="koara-label">IBAN <span className="text-slate-500 font-normal">(Optional)</span></label>
                <input type="text" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="US123..." className="koara-input" dir="ltr" />
              </div>
            </div>

          </div>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => { setErrorMsg(''); setStep(3); }}
              className="dash-btn dash-btn-secondary py-2.5 px-4 rounded-xl"
            >
              <ArrowLeft size={14} /> {t('back')}
            </button>
            <button onClick={handleNext} className="dash-btn dash-btn-primary flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold">
              {t('continue_to_kyc')} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: KYC Document ── */}
      {step === 5 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">KYC & Review</h3>
            <p className="text-sm text-slate-400">{t('desc_upload_kyc')}</p>
          </div>
          <label className="koara-upload-zone block">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 mx-auto" style={{ background: 'rgba(37,99,235,0.15)' }}>
              <UploadCloud size={22} className="text-koara-accent" />
            </div>
            <p className="text-sm font-semibold text-white mb-1">
              {kycDocument ? kycDocument.name : t('click_to_upload')}
            </p>
            <p className="text-xs text-slate-500">{t('max_5mb')}</p>
            {kycDocument && (
              <div className="mt-3 px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                <CheckCircle2 size={12} /> {t('file_selected')}
              </div>
            )}
            <input type="file" id="kycUpload" className="hidden" accept="image/*,.pdf" onChange={(e) => setKycDocument(e.target.files[0])} />
          </label>

          <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t border-slate-700"></div>
            <span className="flex-shrink-0 mx-4 text-slate-500 text-xs font-semibold">OR</span>
            <div className="flex-grow border-t border-slate-700"></div>
          </div>

          <div>
            <label className="koara-label">Invitation Code (Optional Bypass)</label>
            <input
              type="text"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
              placeholder="Enter invitation code"
              className="koara-input"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button onClick={() => { setErrorMsg(''); setStep(4); }} className="dash-btn dash-btn-secondary py-2.5 px-4 rounded-xl">
              <ArrowLeft size={14} /> {t('back')}
            </button>
            <DashButton
              onClick={handleSubmit}
              loading={loading}
              disabled={loading || (!kycDocument && !invitationCode.trim())}
              className="dash-btn dash-btn-primary flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold"
            >
              {t('submit_application')}
            </DashButton>
          </div>
        </div>
      )}

      {/* ── Step 6: Success ── */}
      {step === 6 && (
        <div className="text-center py-10 animate-fade-in space-y-6">
          <div className="mx-auto mb-6 flex justify-center">
            <div className="koara-success-animation">
              <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">Store Created Successfully</h2>
          <p className="text-slate-400 max-w-sm mx-auto leading-relaxed">
            Your store has been created successfully and is now ready to use.
          </p>
          <div className="pt-4 max-w-xs mx-auto">
            <button onClick={resetStateAndClose} className="dash-btn dash-btn-primary w-full justify-center py-3 font-semibold rounded-xl cursor-pointer">
              {t('close') || 'Done'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default OnboardingModal;
