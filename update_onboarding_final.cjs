const fs = require('fs');
let code = fs.readFileSync('src/components/OnboardingModal.jsx', 'utf8');

const stepIndicatorRegex = /\/\/ Step indicator component[\s\S]*?<\/div>\n\);/m;
code = code.replace(stepIndicatorRegex, `const stepsList = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Verify' },
  { id: 3, label: 'Store Info' },
  { id: 4, label: 'Bank Info' },
  { id: 5, label: 'KYC / Review' },
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
);`);

const step1Regex = /\{step === 1 && \([\s\S]*?<div className="space-y-4">[\s\S]*?<p className="text-sm text-slate-400 mb-2">.*?<\/p>/;
code = code.replace(step1Regex, `{step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Create Account</h3>
            <p className="text-sm text-slate-400">{t('desc_enter_email_pass') || 'Enter your details to get started'}</p>
          </div>`);

const step2Regex = /\{step === 2 && \([\s\S]*?<div className="space-y-4">[\s\S]*?<p className="text-sm text-slate-400 mb-2">[\s\S]*?<\/p>/;
code = code.replace(step2Regex, `{step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Verify Email</h3>
            <p className="text-sm text-slate-400">
              {t('desc_enter_6_digit_code')} <span className="text-white font-medium">{email}</span>.
            </p>
          </div>`);

const step3Regex = /\{step === 3 && \([\s\S]*?<div className="space-y-4">[\s\S]*?<p className="text-sm text-slate-400 mb-2">.*?<\/p>/;
code = code.replace(step3Regex, `{step === 3 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Store Information</h3>
            <p className="text-sm text-slate-400">{t('desc_tell_us_store')}</p>
          </div>`);

const step4Regex = /\{step === 4 && \([\s\S]*?<div className="space-y-4">[\s\S]*?<p className="text-sm text-slate-400 mb-2">.*?<\/p>/;
code = code.replace(step4Regex, `{step === 4 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Bank Information</h3>
            <p className="text-sm text-slate-400">{t('desc_enter_bank')}</p>
          </div>`);

const step5Regex = /\{step === 5 && \([\s\S]*?<div className="space-y-4">[\s\S]*?<p className="text-sm text-slate-400 mb-2">.*?<\/p>/;
code = code.replace(step5Regex, `{step === 5 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">KYC & Review</h3>
            <p className="text-sm text-slate-400">{t('desc_upload_kyc')}</p>
          </div>`);

fs.writeFileSync('src/components/OnboardingModal.jsx', code);
console.log('Update Complete.');
