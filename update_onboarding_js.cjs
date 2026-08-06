const fs = require('fs');
let code = fs.readFileSync('src/components/OnboardingModal.jsx', 'utf8');

// Replace StepIndicator
const stepIndicatorStart = code.indexOf('// Step indicator component');
const stepIndicatorEnd = code.indexOf('const OnboardingModal');
const originalStepIndicator = code.substring(stepIndicatorStart, stepIndicatorEnd);

const newStepIndicator = `const stepsList = [
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
              className={\`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 mb-2
                \${isActive ? 'bg-koara-primary text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] scale-110' : 
                  isCompleted ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)] scale-100' : 
                  'bg-slate-800 text-slate-500'}\`}
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
            <span className={\`text-[10px] sm:text-xs font-medium text-center transition-colors duration-300 \${isActive ? 'text-white' : isCompleted ? 'text-green-400' : 'text-slate-500'}\`}>
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

`;

code = code.replace(originalStepIndicator, newStepIndicator);

// Bank fields state
code = code.replace("const [accountNumber, setAccountNumber] = useState('');", "const [accountNumber, setAccountNumber] = useState('');\n  const [bban, setBban] = useState('');\n  const [iban, setIban] = useState('');");
code = code.replace("setAccountNumber('');", "setAccountNumber('');\n      setBban('');\n      setIban('');");

// Submit payload
code = code.replace("formData.append('account_number', accountNumber.trim());", "formData.append('account_number', accountNumber.trim());\n    if (bban.trim()) formData.append('bban', bban.trim());\n    if (iban.trim()) formData.append('iban', iban.trim());");

// StepIndicator render
code = code.replace("<StepIndicator current={step} total={5} />", "<StepIndicator current={step} />");

// Step 1 Header
const s1Start = code.indexOf('{step === 1 && (');
const s1End = code.indexOf('<div className="space-y-3">', s1Start);
const s1Rep = `{step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Create Account</h3>
            <p className="text-sm text-slate-400">{t('desc_enter_email_pass') || 'Enter your details to get started'}</p>
          </div>
          `;
code = code.replace(code.substring(s1Start, s1End), s1Rep);

// Step 2 Header
const s2Start = code.indexOf('{step === 2 && (');
const s2End = code.indexOf('<div>', s2Start);
const s2Rep = `{step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Verify Email</h3>
            <p className="text-sm text-slate-400">
              {t('desc_enter_6_digit_code')} <span className="text-white font-medium">{email}</span>.
            </p>
          </div>
          `;
code = code.replace(code.substring(s2Start, s2End), s2Rep);

// Step 3 Header
const s3Start = code.indexOf('{step === 3 && (');
const s3End = code.indexOf('<div className="space-y-3">', s3Start);
const s3Rep = `{step === 3 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Store Information</h3>
            <p className="text-sm text-slate-400">{t('desc_tell_us_store')}</p>
          </div>
          `;
code = code.replace(code.substring(s3Start, s3End), s3Rep);

// Step 4 Header & Fields
const s4Start = code.indexOf('{step === 4 && (');
const s4End = code.indexOf('<div className="space-y-3">', s4Start);
const s4Rep = `{step === 4 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Bank Information</h3>
            <p className="text-sm text-slate-400">{t('desc_enter_bank')}</p>
          </div>
          `;
code = code.replace(code.substring(s4Start, s4End), s4Rep);

const s4InputsStart = code.indexOf('<div>\r\n              <label className="koara-label">{t(\'account_number\')}</label>');
if(s4InputsStart === -1) {
    const s4InputsStartAlt = code.indexOf('<div>\n              <label className="koara-label">{t(\'account_number\')}</label>');
    const s4InputsEnd = code.indexOf('</div>', s4InputsStartAlt) + 6;
    code = code.substring(0, s4InputsStartAlt) + `<div>
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
            </div>` + code.substring(s4InputsEnd);
} else {
    const s4InputsEnd = code.indexOf('</div>', s4InputsStart) + 6;
    code = code.substring(0, s4InputsStart) + `<div>
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
            </div>` + code.substring(s4InputsEnd);
}

// Step 5 Header
const s5Start = code.indexOf('{step === 5 && (');
const s5End = code.indexOf('<label className="koara-upload-zone', s5Start);
const s5Rep = `{step === 5 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">KYC & Review</h3>
            <p className="text-sm text-slate-400">{t('desc_upload_kyc')}</p>
          </div>
          `;
code = code.replace(code.substring(s5Start, s5End), s5Rep);

// Step 6 Full
const s6Start = code.indexOf('{step === 6 && (');
const s6End = code.indexOf('</Modal>');
const s6Rep = `{step === 6 && (
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
    `;
code = code.replace(code.substring(s6Start, s6End), s6Rep);

fs.writeFileSync('src/components/OnboardingModal.jsx', code);
console.log('Update Complete.');
