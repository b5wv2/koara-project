const fs = require('fs');
let code = fs.readFileSync('src/components/OnboardingModal.jsx', 'utf8');

const oldStepIndicator = `// Step indicator component
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
          background: i + 1 <= current ? 'linear-gradient(135deg, #2563EB 11%, #7C3AED 79%)' : 'rgba(255,255,255,0.1)',
        }}
      />
    ))}
  </div>
);`;

const newStepIndicator = `const stepsList = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Verify' },
  { id: 3, label: 'Store Info' },
  { id: 4, label: 'Bank Info' },
  { id: 5, label: 'KYC' },
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
);`;

code = code.replace(oldStepIndicator, newStepIndicator);
code = code.replace("const [accountNumber, setAccountNumber] = useState('');", "const [accountNumber, setAccountNumber] = useState('');\n  const [bban, setBban] = useState('');\n  const [iban, setIban] = useState('');");
code = code.replace("setAccountNumber('');", "setAccountNumber('');\n      setBban('');\n      setIban('');");
code = code.replace("formData.append('account_number', accountNumber.trim());", "formData.append('account_number', accountNumber.trim());\n    if (bban.trim()) formData.append('bban', bban.trim());\n    if (iban.trim()) formData.append('iban', iban.trim());");
code = code.replace("<StepIndicator current={step} total={5} />", "<StepIndicator current={step} />");

const oldStep1 = `{step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400 mb-2">{t('')}</p>`;
const newStep1 = `{step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Create Account</h3>
            <p className="text-sm text-slate-400">{t('desc_enter_email_pass') || 'Enter your details to get started'}</p>
          </div>`;
code = code.replace(oldStep1, newStep1);

const oldStep2 = `{step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400 mb-2">
            {t('desc_enter_6_digit_code')} <span className="text-white font-medium">{email}</span>.
          </p>`;
const newStep2 = `{step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Verify Email</h3>
            <p className="text-sm text-slate-400">
              {t('desc_enter_6_digit_code')} <span className="text-white font-medium">{email}</span>.
            </p>
          </div>`;
code = code.replace(oldStep2, newStep2);

const oldStep3 = `{step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400 mb-2">{t('desc_tell_us_store')}</p>`;
const newStep3 = `{step === 3 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Store Information</h3>
            <p className="text-sm text-slate-400">{t('desc_tell_us_store')}</p>
          </div>`;
code = code.replace(oldStep3, newStep3);

const oldStep4 = `{step === 4 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400 mb-2">{t('desc_enter_bank')}</p>`;
const newStep4 = `{step === 4 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Bank Information</h3>
            <p className="text-sm text-slate-400">{t('desc_enter_bank')}</p>
          </div>`;
code = code.replace(oldStep4, newStep4);

const oldStep4Inputs = `<div>
              <label className="koara-label">{t('account_number')}</label>
              <input required type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="1234567890" className="koara-input" />
            </div>`;
const newStep4Inputs = `<div>
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
            </div>`;
code = code.replace(oldStep4Inputs, newStep4Inputs);

const oldStep5 = `{step === 5 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400 mb-2">{t('desc_upload_kyc')}</p>`;
const newStep5 = `{step === 5 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">KYC & Review</h3>
            <p className="text-sm text-slate-400">{t('desc_upload_kyc')}</p>
          </div>`;
code = code.replace(oldStep5, newStep5);

code = code.replace(/{step === 6 && \([\s\S]*?<\/Modal>/, `{step === 6 && (
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
    </Modal>`);

fs.writeFileSync('src/components/OnboardingModal.jsx', code);
