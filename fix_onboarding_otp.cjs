const fs = require('fs');
let code = fs.readFileSync('src/components/OnboardingModal.jsx', 'utf8');

code = code.replace(/} catch \(err\) \{\s*setOtpError\(true\);\s*setVerificationCode\(''\);\s*throw err;\s*\}/g,
`} catch (err) {
      setOtpError(true);
      setVerificationCode('');
      return { success: false, error: err.message };
    }`);

const oldOtpRegex = /<OTPInput[\s\S]*?\/>/;
const newOtp = `<OTPInput
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
            )}`;
            
if (code.match(oldOtpRegex)) {
  code = code.replace(oldOtpRegex, newOtp);
}

fs.writeFileSync('src/components/OnboardingModal.jsx', code);
console.log('Fixed OnboardingModal');
