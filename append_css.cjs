const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

css += `\n/* ─── OTP Digit & Warning Animations ─── */\n`;
css += `@keyframes otp-digit-in {\n  0% { opacity: 0; transform: translateY(10px) scale(0.95); }\n  100% { opacity: 1; transform: translateY(0) scale(1); }\n}\n`;
css += `.animate-otp-in { animation: otp-digit-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }\n\n`;
css += `@keyframes warning-stroke {\n  100% { stroke-dashoffset: 0; }\n}\n`;
css += `@keyframes warning-scale {\n  0% { transform: scale(0.8); opacity: 0; }\n  100% { transform: scale(1); opacity: 1; }\n}\n`;
css += `.animate-warning-circle { stroke-dasharray: 166; stroke-dashoffset: 166; animation: warning-stroke 0.4s cubic-bezier(0.65, 0, 0.45, 1) forwards; }\n`;
css += `.animate-warning-icon { stroke-dasharray: 48; stroke-dashoffset: 48; animation: warning-stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.2s forwards; }\n`;
css += `.animate-warning-box { animation: warning-scale 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }\n`;

fs.writeFileSync('src/index.css', css);
console.log('Appended to index.css');
