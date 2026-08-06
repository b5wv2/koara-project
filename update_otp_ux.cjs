const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

if (!css.includes('animate-shake')) {
  css += `\n/* ─── Shake Animation ─── */\n`;
  css += `@keyframes shake {\n  0%, 100% { transform: translateX(0); }\n  25% { transform: translateX(-5px); }\n  75% { transform: translateX(5px); }\n}\n`;
  css += `.animate-shake { animation: shake 0.2s cubic-bezier(0.36, 0.07, 0.19, 0.97) 2; }\n`;
  fs.writeFileSync('src/index.css', css);
  console.log('Appended shake to index.css');
}

let otp = fs.readFileSync('src/components/OTPInput.jsx', 'utf8');
otp = otp.replace(
  'const OTPInput = ({ length = 6, onComplete, value, onChange }) => {',
  'const OTPInput = ({ length = 6, onComplete, value, onChange, disabled = false, hasError = false }) => {'
);

const effectRegex = /useEffect\(\(\) => \{\s*if \(value !== undefined\).*?\s*\}, \[value, length\]\);/s;
const match = otp.match(effectRegex);
if (match) {
  const newEffects = `${match[0]}

  useEffect(() => {
    if (hasError && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [hasError]);`;
  otp = otp.replace(match[0], newEffects);
}

const inputRegex = /<input\s+key=\{index\}[^>]*className=\{`([^`]+)`\}\s*\/>/g;
otp = otp.replace(inputRegex, (match, classes) => {
  let newClasses = classes.replace('bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-koara-blue focus:ring-2 focus:ring-koara-blue/20 transition-all', '');
  newClasses = `w-10 h-12 text-center text-xl font-semibold bg-slate-900 border text-white rounded-xl focus:outline-none focus:ring-2 transition-all \${hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-700 focus:border-koara-blue focus:ring-koara-blue/20'} \${data !== '' ? 'animate-otp-in' : ''}`;
  return match
    .replace(classes, newClasses)
    .replace('className={`', `disabled={disabled}\n          className={\``);
});

otp = otp.replace('<div className="flex gap-2 justify-center" onPaste={handlePaste}>', '<div className={`flex gap-2 justify-center ${hasError ? "animate-shake" : ""}`} onPaste={handlePaste}>');

fs.writeFileSync('src/components/OTPInput.jsx', otp);
console.log('Updated OTPInput.jsx');
