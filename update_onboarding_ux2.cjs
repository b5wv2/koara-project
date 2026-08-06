const fs = require('fs');

let code = fs.readFileSync('src/components/OnboardingModal.jsx', 'utf8');

if (!code.includes("const [otpError, setOtpError] = useState(false);")) {
  code = code.replace(
    "const [errorMsg, setErrorMsg] = useState('');",
    "const [errorMsg, setErrorMsg] = useState('');\n  const [otpError, setOtpError] = useState(false);"
  );
}

const oldStart = code.indexOf("const handleVerifyRegistrationCode");
const oldEnd = code.indexOf("const handleSubmit = (e) => execute(async () => {");

if (oldStart !== -1 && oldEnd !== -1) {
  const newFns = `const handleVerifyRegistrationCode = (codeFromParam) => execute(async () => {
    const codeToVerify = typeof codeFromParam === 'string' ? codeFromParam : verificationCode;
    if (!codeToVerify || codeToVerify.length < 6) {
      setOtpError(true);
      return { success: false };
    }
    setErrorMsg('');
    setOtpError(false);
    
    try {
      const response = await fetch(\`\${API_BASE_URL}/api/auth/verify-registration-code\`, {
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
      throw err;
    }
  });

  const handleResendCode = () => execute(async () => {
    if (cooldown > 0 || loading) return { success: false };
    setErrorMsg('');
    setSuccessMsg('');
    const response = await fetch(\`\${API_BASE_URL}/api/auth/send-registration-code\`, {
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
      const response = await fetch(\`\${API_BASE_URL}/api/store/check-subdomain/\${cleanVal}\`);
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

  `;
  
  const oldChunk = code.substring(oldStart, oldEnd);
  code = code.replace(oldChunk, newFns);
}

const otpRegex = new RegExp('<OTPInput[\\\\s\\\\S]*?/>');
const newOtp = `<OTPInput
              length={6}
              value={verificationCode}
              onChange={(val) => { setVerificationCode(val); setOtpError(false); }}
              onComplete={handleVerifyRegistrationCode}
              disabled={loading}
              hasError={otpError}
            />
            {otpError && (
              <p className="text-red-500 text-sm mt-3 text-center font-medium animate-fade-in">
                Incorrect verification code. Please try again.
              </p>
            )}`;

if (code.match(otpRegex)) {
  code = code.replace(otpRegex, newOtp);
}

const dashBtnRegex = new RegExp('<DashButton[\\\\s\\\\S]*?Verify Code[\\\\s\\\\S]*?</DashButton>');
const newDashBtn = `<DashButton 
              onClick={() => handleVerifyRegistrationCode(verificationCode)}
              loading={loading}
              disabled={loading || verificationCode.length < 6}
              className="dash-btn dash-btn-primary w-full justify-center py-3 mt-4 text-base font-semibold rounded-xl cursor-pointer"
            >
              Verify Code
            </DashButton>`;

if (code.match(dashBtnRegex)) {
  code = code.replace(dashBtnRegex, newDashBtn);
}

const storeInfoNextRegex = /disabled={loading.*?className="dash-btn dash-btn-primary flex-1"/;
code = code.replace(storeInfoNextRegex, `disabled={loading || !firstName.trim() || !lastName.trim() || !storeName.trim() || !subdomain.trim() || subdomainStatus !== 'available'} className="dash-btn dash-btn-primary flex-1"`);

fs.writeFileSync('src/components/OnboardingModal.jsx', code);
console.log('Successfully updated OnboardingModal.jsx');
