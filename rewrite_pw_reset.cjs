const fs = require('fs');

let code = fs.readFileSync('src/components/PasswordResetModal.jsx', 'utf8');

// Update handleVerifyCode error handling
code = code.replace(/} catch \(err\) \{\s*setOtpError\(true\);\s*setCode\(''\);\s*throw err;\s*\}/g,
  `} catch (err) {
      setOtpError(true);
      setCode('');
      return { success: false, error: err.message };
    }`);

// Update Step 1 Form styling
code = code.replace(/<p className="text-sm text-slate-500 mb-2">\{t\('enter_email_desc'\)\}<\/p>/g,
  `<div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">{t('reset_password_title')}</h3>
            <p className="text-sm text-slate-400">{t('enter_email_desc')}</p>
          </div>`);
code = code.replace(/<label className="block text-xs font-medium text-slate-700 mb-1">/g, '<label className="koara-label">');
code = code.replace(/className={`w-full px-3 py-2 bg-white text-black border \${errorMsg && !email\.trim\(\) \? 'border-red-500' : 'border-slate-200'} rounded-lg text-sm focus:outline-none focus:ring-1`}/g, 'className="koara-input"');
code = code.replace(/className="dash-btn dash-btn-primary w-full mt-4 bg-black text-white py-2\.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"/g, 'className="dash-btn dash-btn-primary w-full justify-center py-2.5 text-sm font-semibold rounded-xl mt-4"');

// Update Step 2 Form styling
code = code.replace(/<p className="text-sm text-slate-500 mb-2">\{t\('enter_code_sent_to'\)\} <strong>\{email\}<\/strong>\.<\/p>/g,
  `<div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">{t('verification_code')}</h3>
            <p className="text-sm text-slate-400">
              {t('enter_code_sent_to')} <span className="text-white font-medium">{email}</span>.
            </p>
          </div>`);
code = code.replace(/<label className="block text-xs font-medium text-slate-700 mb-4 text-center">\{t\('verification_code'\)\}<\/label>/g, '<label className="koara-label text-center block mb-4">{t(\'verification_code\')}</label>');
code = code.replace(/<OTPInput \s*length=\{6\}\s*value=\{code\}\s*onChange=\{setCode\}\s*onComplete=\{\(completedCode\) => handleVerifyCode\(completedCode\)\}\s*\/>/g,
  `<OTPInput 
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
            )}`);
code = code.replace(/className="dash-btn dash-btn-primary w-full mt-6 bg-black text-white py-2\.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"/g, 'className="dash-btn dash-btn-primary w-full justify-center py-2.5 text-sm font-semibold rounded-xl mt-6"');

// Update Step 3 Form styling
code = code.replace(/<p className="text-sm text-slate-500 mb-2">\{t\('enter_new_password'\)\}<\/p>/g,
  `<div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">{t('new_password')}</h3>
            <p className="text-sm text-slate-400">{t('enter_new_password')}</p>
          </div>`);
code = code.replace(/className="w-full px-3 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-koara-blue focus:ring-1 focus:ring-koara-blue"/g, 'className="koara-input"');
code = code.replace(/className="dash-btn dash-btn-primary w-full mt-4 bg-koara-blue text-white py-2\.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"/g, 'className="dash-btn dash-btn-primary w-full justify-center py-2.5 text-sm font-semibold rounded-xl mt-4"');

// Update Step 4 Form styling
const oldStep4 = /{step === 4 && \([\s\S]*?<\/div>\s*\)}/;
const newStep4 = `{step === 4 && (
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
            <button onClick={() => { resetState(); onClose(); }} className="dash-btn dash-btn-primary w-full justify-center py-3 font-semibold rounded-xl cursor-pointer">
              {t('close')}
            </button>
          </div>
        </div>
      )}`;
code = code.replace(oldStep4, newStep4);

code = code.replace(/<div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-lg mt-4 text-center">/g, '<div className="koara-error-msg text-center mt-4">');

fs.writeFileSync('src/components/PasswordResetModal.jsx', code);
console.log('PasswordResetModal rewritten');
