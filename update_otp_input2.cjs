const fs = require('fs');

let otp = fs.readFileSync('src/components/OTPInput.jsx', 'utf8');

const inputRegex = new RegExp('<input[\\\\s\\\\S]*?/>');
const newInput = `<input
          key={index}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          ref={(ref) => (inputRefs.current[index] = ref)}
          value={data}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className={\`w-10 h-12 text-center text-xl font-semibold bg-slate-900 border text-white rounded-xl focus:outline-none focus:ring-2 transition-all \${hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-700 focus:border-koara-blue focus:ring-koara-blue/20'} \${data !== '' ? 'animate-otp-in' : ''}\`}
        />`;

if (otp.match(inputRegex)) {
  otp = otp.replace(inputRegex, newInput);
  fs.writeFileSync('src/components/OTPInput.jsx', otp);
  console.log('Successfully updated OTPInput.jsx classes');
} else {
  console.log('Failed to match input element in OTPInput.jsx');
}
