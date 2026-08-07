const fs = require('fs');
let code = fs.readFileSync('src/components/PasswordResetModal.jsx', 'utf8');

code = code.replace(/} catch \(err\) \{\s*setErrorMsg\(err\.message\);\s*throw err;\s*\}/g, 
  `} catch (err) {
      setErrorMsg(err.message);
      return { success: false, error: err.message };
    }`);

const oldTopError = /{errorMsg && \(\s*<div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 mb-4">\s*{errorMsg}\s*<\/div>\s*\)}/;
const newTopError = `{errorMsg && (
        <div className="koara-error-msg mb-4">
          {errorMsg}
        </div>
      )}`;
if (code.match(oldTopError)) {
  code = code.replace(oldTopError, newTopError);
}

const oldInputDiv = /<div>\s*<label className="block text-xs font-medium text-slate-700 mb-1">\{t\('email_address'\)\}<\/label>\s*<input[\s\S]*?required\s*\/>\s*<\/div>/;

if (code.match(oldInputDiv)) {
  const match = code.match(oldInputDiv)[0];
  const newInputDiv = match.replace('<input ', '<input \n              className={`w-full px-3 py-2 bg-white text-black border ${errorMsg ? \\'border-red-500 focus:border-red-500 focus:ring-red-500/20\\' : \\'border-slate-200 focus:border-koara-blue focus:ring-koara-blue\\'} rounded-lg text-sm focus:outline-none focus:ring-1`} \n              ')
  .replace('className="w-full px-3 py-2 bg-white text-black border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-koara-blue focus:ring-1 focus:ring-koara-blue"', '')
  + `\n            {errorMsg && (
              <p className="text-red-500 text-sm mt-2 font-medium animate-fade-in">
                {errorMsg}
              </p>
            )}`;
  code = code.replace(oldInputDiv, newInputDiv);
}

fs.writeFileSync('src/components/PasswordResetModal.jsx', code);
console.log('Fixed PasswordResetModal');
