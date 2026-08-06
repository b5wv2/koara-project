const fs = require('fs');

let code = fs.readFileSync('src/components/OnboardingModal.jsx', 'utf8');

code = code.replace(
  `  const [bban, setBban] = useState('');
  const [iban, setIban] = useState('');
  const [bban, setBban] = useState('');
  const [iban, setIban] = useState('');`,
  `  const [bban, setBban] = useState('');
  const [iban, setIban] = useState('');`
);

code = code.replace(
  `    if (bban.trim()) formData.append('bban', bban.trim());
    if (iban.trim()) formData.append('iban', iban.trim());
    if (bban.trim()) formData.append('bban', bban.trim());
    if (iban.trim()) formData.append('iban', iban.trim());`,
  `    if (bban.trim()) formData.append('bban', bban.trim());
    if (iban.trim()) formData.append('iban', iban.trim());`
);

fs.writeFileSync('src/components/OnboardingModal.jsx', code);
console.log('Fixed duplicates');
