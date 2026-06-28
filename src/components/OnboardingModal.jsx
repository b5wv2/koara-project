import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import OTPInput from './OTPInput';
import { UploadCloud, CheckCircle2, ArrowRight, ArrowLeft, Building2, User, ShieldCheck, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

// Step indicator component
const StepIndicator = ({ current, total }) => (
  <div className="flex items-center justify-center gap-2 mb-6">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className="transition-all duration-300"
        style={{
          width: i + 1 === current ? 24 : 8,
          height: 8,
          borderRadius: 9999,
          background: i + 1 <= current ? '#2563EB' : 'rgba(255,255,255,0.1)',
        }}
      />
    ))}
  </div>
);

const OnboardingModal = ({ isOpen, onClose, initialData }) => {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const { t } = useAppContext();

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

  // KYC Document
  const [kycDocument, setKycDocument] = useState(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [globalLockUntil, setGlobalLockUntil] = useState(null);
  const [lockCountdown, setLockCountdown] = useState('');

  useEffect(() => {
    if (isOpen && initialData?.isGoogleAuth) {
      setEmail(initialData.email);
      // Generate a highly secure random password for the user since they authenticate via Google
      const randomPassword = crypto.randomUUID 
        ? crypto.randomUUID() 
        : Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      setPassword(randomPassword);
      setStep(2); // Skip Step 1 and jump to OTP verification
    } else if (!isOpen) {
      // Clean up when modal closes, reset everything
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
      setKycDocument(null);
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

  const handleSendRegistrationCode = async () => {
    if (!email.trim() || !password) {
      setErrorMsg('Please enter email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
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
        throw new Error(data.error || 'Failed to send code.');
      }

      setStep(2);
      setCooldown(60);
      setSuccessMsg('Verification code sent to your email.');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRegistrationCode = async (codeFromParam) => {
    const codeToVerify = typeof codeFromParam === 'string' ? codeFromParam : verificationCode;
    if (!codeToVerify || codeToVerify.length < 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
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
        throw new Error(data.error || 'Invalid code.');
      }

      setSuccessMsg('');
      setStep(3);
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
        throw new Error(data.error || 'Failed to resend code.');
      }

      setCooldown(60);
      setSuccessMsg('A new verification code has been sent.');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setErrorMsg('');
    if (step === 3) {
      if (!firstName.trim() || !lastName.trim() || !storeName.trim() || !subdomain.trim()) {
        setErrorMsg('All store profile fields and subdomain are required.');
        return;
      }
      if (subdomainStatus === 'unavailable') {
        setErrorMsg('The selected subdomain is not available.');
        return;
      }
      if (subdomainStatus === 'checking') {
        setErrorMsg('Still checking subdomain availability, please wait.');
        return;
      }
    } else if (step === 4) {
      if (!bankName.trim() || !accountHolderName.trim() || !accountNumber.trim()) {
        setErrorMsg('All bank information fields are required.');
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
        .replace(/(^-|-$)/g, '');
      handleSubdomainChange(slug);
    }
  };

  const handleSubdomainChange = async (val) => {
    const cleanVal = val.toLowerCase().replace(/[^a-z0-9-]+/g, '');
    setSubdomain(cleanVal);

    if (cleanVal.length < 3) {
      setSubdomainStatus('');
      setSubdomainError('Must be at least 3 characters.');
      return;
    }

    setSubdomainStatus('checking');
    setSubdomainError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/store/check-subdomain/${cleanVal}`);
      const data = await response.json();
      if (data.available) {
        setSubdomainStatus('available');
      } else {
        setSubdomainStatus('unavailable');
        setSubdomainError(data.error || 'Subdomain not available.');
      }
    } catch (err) {
      setSubdomainStatus('unavailable');
      setSubdomainError('Failed to check availability.');
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (!kycDocument) {
        throw new Error('Please upload a KYC document.');
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
      formData.append('kyc_document', kycDocument);

      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize store onboarding. Please check inputs.');
      }

      setStep(6);
    } catch (err) {
      console.error('Onboarding submit error:', err.message);
      setErrorMsg(err.message || 'Connection failed. Please ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const resetStateAndClose = () => {
    onClose();
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
    setKycDocument(null);
    setErrorMsg('');
    setSuccessMsg('');
    setCooldown(0);
  };

  // Shared step label
  const stepLabels = ['Account', 'Verify', 'Store', 'Banking', 'KYC'];

  return (
    <Modal isOpen={isOpen} onClose={resetStateAndClose} title={t('create_store') || 'Open your store'}>
      {/* Step indicator for steps 1-5 */}
      {step <= 5 && <StepIndicator current={step} total={5} />}

      {/* Step label */}
      {step <= 5 && (
        <div className="flex items-center gap-2 mb-5">
          {step === 1 && <Mail size={14} className="text-koara-accent" />}
          {step === 2 && <Mail size={14} className="text-koara-accent" />}
          {step === 3 && <Building2 size={14} className="text-koara-accent" />}
          {step === 4 && <User size={14} className="text-koara-accent" />}
          {step === 5 && <ShieldCheck size={14} className="text-koara-accent" />}
          <span className="text-xs font-bold uppercase tracking-widest text-koara-accent">
            {stepLabels[step - 1]}
          </span>
        </div>
      )}

      {/* Error / Success Messages */}
      {errorMsg && <div className="koara-error-msg mb-4">{errorMsg}</div>}
      {successMsg && <div className="koara-success-msg mb-4">{successMsg}</div>}

      {/* ── Step 1: Account ── */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400 mb-2">Create a new merchant account to get started.</p>
          <div className="space-y-3">
            <div>
              <label className="koara-label">{t('email_address')}</label>
              <input
                required type="email"
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
                required type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="koara-input"
              />
            </div>
          </div>
          {globalLockUntil && (
            <div className="koara-error-msg text-center">
              Verification locked. Try again in {lockCountdown}
            </div>
          )}
          <button
            onClick={handleSendRegistrationCode}
            disabled={loading || !!globalLockUntil}
            className="dash-btn dash-btn-primary w-full justify-center py-2.5 text-sm font-semibold rounded-xl mt-4"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</>
            ) : (
              <>Continue <ArrowRight size={14} /></>
            )}
          </button>
        </div>
      )}

      {/* ── Step 2: Verify Email ── */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400 mb-2">
            Enter the 6-digit code sent to <span className="text-white font-medium">{email}</span>.
          </p>
          <div>
            <label className="koara-label text-center block mb-4">Verification Code</label>
            <OTPInput
              length={6}
              value={verificationCode}
              onChange={setVerificationCode}
              onComplete={(code) => handleVerifyRegistrationCode(code)}
            />
          </div>
          {globalLockUntil && (
            <div className="koara-error-msg text-center">
              Verification locked. Try again in {lockCountdown}
            </div>
          )}
          <button
            onClick={handleVerifyRegistrationCode}
            disabled={loading || verificationCode.length < 6 || !!globalLockUntil}
            className="dash-btn dash-btn-primary w-full justify-center py-2.5 text-sm font-semibold rounded-xl mt-2"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying...</>
            ) : 'Verify Email'}
          </button>
          <div className="text-center">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={cooldown > 0 || loading || !!globalLockUntil}
              className="text-sm text-koara-accent hover:underline disabled:text-slate-600 disabled:no-underline font-medium transition-colors"
            >
              {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend Code'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Store Info ── */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400 mb-2">Tell us about your store.</p>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="koara-label">First Name</label>
                <input required type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" className="koara-input" />
              </div>
              <div className="flex-1">
                <label className="koara-label">Last Name</label>
                <input required type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className="koara-input" />
              </div>
            </div>
            <div>
              <label className="koara-label">{t('store_name')}</label>
              <input required type="text" value={storeName} onChange={(e) => handleStoreNameChange(e.target.value)} placeholder="Acme Digital" className="koara-input" />
            </div>
            <div>
              <label className="koara-label">Store Subdomain</label>
              <div className="flex" dir="ltr">
                <input
                  required type="text"
                  value={subdomain}
                  onChange={(e) => handleSubdomainChange(e.target.value)}
                  placeholder="acme"
                  className={`koara-input rounded-r-none border-r-0 flex-1 ${
                    subdomainStatus === 'unavailable' ? 'border-red-500/50 focus:border-red-500' :
                    subdomainStatus === 'available' ? 'border-green-500/50 focus:border-green-500' : ''
                  }`}
                />
                <span className="inline-flex items-center px-3 border border-white/10 border-l-0 bg-white/5 text-slate-500 text-sm rounded-r-[10px] whitespace-nowrap">
                  .getkoara.com
                </span>
              </div>
              {subdomainStatus === 'checking' && <p className="text-xs text-slate-500 mt-1.5">Checking availability...</p>}
              {subdomainStatus === 'available' && <p className="text-xs text-green-500 font-medium mt-1.5">✓ Subdomain is available</p>}
              {subdomainStatus === 'unavailable' && <p className="text-xs text-red-400 font-medium mt-1.5">✗ {subdomainError}</p>}
            </div>
          </div>
          <button onClick={handleNext} className="dash-btn dash-btn-primary w-full justify-center py-2.5 text-sm font-semibold rounded-xl mt-2">
            Continue to Bank Info <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ── Step 4: Bank Info ── */}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400 mb-2">Enter your bank details to receive payouts.</p>
          <div className="space-y-3">
            <div>
              <label className="koara-label">Bank Name</label>
              <input required type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Chase Bank" className="koara-input" />
            </div>
            <div>
              <label className="koara-label">Account Holder Name</label>
              <input required type="text" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} placeholder="John Doe" className="koara-input" />
            </div>
            <div>
              <label className="koara-label">Account Number</label>
              <input required type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="1234567890" className="koara-input" dir="ltr" />
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => { setErrorMsg(''); setStep(3); }}
              className="dash-btn dash-btn-secondary py-2.5 px-4 rounded-xl"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button onClick={handleNext} className="dash-btn dash-btn-primary flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold">
              Continue to KYC <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: KYC Document ── */}
      {step === 5 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400 mb-2">Upload your National ID or Passport to verify your identity.</p>

          <label className="koara-upload-zone block">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 mx-auto" style={{ background: 'rgba(37,99,235,0.15)' }}>
              <UploadCloud size={22} className="text-koara-accent" />
            </div>
            <p className="text-sm font-semibold text-white mb-1">
              {kycDocument ? kycDocument.name : 'Click to upload or drag & drop'}
            </p>
            <p className="text-xs text-slate-500">PNG, JPG or PDF (max. 5MB)</p>
            {kycDocument && (
              <div className="mt-3 px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                <CheckCircle2 size={12} /> File selected
              </div>
            )}
            <input type="file" accept=".png,.jpg,.jpeg,.pdf" className="hidden" onChange={(e) => setKycDocument(e.target.files[0])} />
          </label>

          <div className="flex gap-3">
            <button onClick={() => { setErrorMsg(''); setStep(4); }} className="dash-btn dash-btn-secondary py-2.5 px-4 rounded-xl">
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !kycDocument}
              className="dash-btn dash-btn-primary flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</>
              ) : 'Submit Application'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 6: Success ── */}
      {step === 6 && (
        <div className="text-center py-6">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-green-400/20 rounded-full animate-ping" />
            <div className="relative w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)' }}>
              <CheckCircle2 size={36} className="text-green-400" />
            </div>
          </div>
          <h4 className="text-xl font-bold text-white mb-2">Application Submitted</h4>
          <p className="text-sm text-slate-400 mb-8 leading-relaxed max-w-xs mx-auto">
            Your store is under review. Our team will verify your documents within 24 hours. You'll receive an email once approved.
          </p>
          <button
            onClick={() => { resetStateAndClose(); navigate('/'); }}
            className="dash-btn dash-btn-primary w-full justify-center py-2.5 text-sm font-semibold rounded-xl"
          >
            Done
          </button>
        </div>
      )}
    </Modal>
  );
};

export default OnboardingModal;
