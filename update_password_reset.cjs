const fs = require('fs');

let code = fs.readFileSync('src/components/PasswordResetModal.jsx', 'utf8');

if (!code.includes('const [otpError, setOtpError] = useState(false);')) {
  code = code.replace(
    "const [errorMsg, setErrorMsg] = useState('');",
    "const [errorMsg, setErrorMsg] = useState('');\n  const [otpError, setOtpError] = useState(false);"
  );
}

const reqStart = code.indexOf('const handleRequestCode');
const reqEnd = code.indexOf('const handleResetPassword = (e) => execute(async () => {');

if (reqStart !== -1 && reqEnd !== -1) {
  const newFns = `const handleRequestCode = (e) => execute(async () => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !email.trim()) {
      setErrorMsg(t('err_enter_email') || 'Please enter a valid email address.');
      return { success: false };
    }

    try {
      const response = await fetch(\`\${API_BASE_URL}/api/auth/forgot-password\`, {
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
      throw err;
    }
  });

  const handleResendCode = () => execute(async () => {
    if (cooldown > 0 || loading) return { success: false };
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(\`\${API_BASE_URL}/api/auth/forgot-password\`, {
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
      setSuccessMsg(t('success_new_code') || 'A new code has been sent.');
      return { success: true };
    } catch (err) {
      setErrorMsg(err.message);
      throw err;
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
      const response = await fetch(\`\${API_BASE_URL}/api/auth/verify-reset-code\`, {
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
      throw err;
    }
  });

  `;
  
  const oldChunk = code.substring(reqStart, reqEnd);
  code = code.replace(oldChunk, newFns);
}

const otpRegex = new RegExp('<OTPInput[\\\\s\\\\S]*?/>');
const newOtp = `<OTPInput 
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
            )}`;

if (code.match(otpRegex)) {
  code = code.replace(otpRegex, newOtp);
}

fs.writeFileSync('src/components/PasswordResetModal.jsx', code);
console.log('Successfully updated PasswordResetModal.jsx');
