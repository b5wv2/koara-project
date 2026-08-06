const fs = require('fs');
let code = fs.readFileSync('src/components/OnboardingModal.jsx', 'utf8');

const oldHandleNext = `  const handleNext = () => {
    setErrorMsg('');
    if (step === 3) {
      if (!firstName.trim() || !lastName.trim() || !storeName.trim() || !subdomain.trim()) {
        setErrorMsg(t('err_req_store_fields'));
        return;
      }
      if (subdomainStatus === 'checking') {
        setErrorMsg(t('err_checking_subdomain'));
        return;
      }
      if (subdomainStatus === 'unavailable') {
        setErrorMsg(subdomainError || t('err_subdomain_unavailable'));
        return;
      }
    } else if (step === 4) {
      if (!bankName.trim() || !accountHolderName.trim() || !accountNumber.trim()) {
        setErrorMsg(t('err_req_bank_fields'));
        return;
      }
    }
    setStep(s => s + 1);
  };`;

const newHandleNext = `  const handleNext = () => {
    setErrorMsg('');
    if (step === 3) {
      if (!firstName.trim() || !lastName.trim() || !storeName.trim() || !subdomain.trim()) {
        setErrorMsg(t('err_req_store_fields'));
        return;
      }
      if (subdomainStatus === 'checking' || subdomainStatus === 'invalid' || subdomainStatus === 'unavailable') {
        setErrorMsg(subdomainError || t('err_subdomain_unavailable'));
        return;
      }
    } else if (step === 4) {
      if (!bankName.trim() || !accountHolderName.trim() || !accountNumber.trim()) {
        setErrorMsg(t('err_req_bank_fields'));
        return;
      }
    }
    setStep(s => s + 1);
  };`;

const oldHandleStoreAndSubdomain = `  const handleStoreNameChange = (val) => {
    setStoreName(val);
    if (!subdomain) {
      const slug = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/(^-|-$)/g, '');
      handleSubdomainChange(slug);
    }
  };

  const handleSubdomainChange = (val) => execute(async () => {
    const cleanVal = val.toLowerCase().replace(/[^a-z0-9-]+/g, '');
    setSubdomain(cleanVal);

    if (cleanVal.length < 3) {
      setSubdomainStatus('');
      setSubdomainError(t('err_subdomain_length'));
      return;
    }

    setSubdomainStatus('checking');
    setSubdomainError('');`;

const newHandleStoreAndSubdomain = `  const handleStoreNameChange = (val) => {
    setStoreName(val);
    if (!subdomain) {
      const slug = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/(^-|-$)/g, '');
      if (slug.length >= 3) handleSubdomainChange(slug);
    }
  };

  const handleSubdomainChange = (val) => execute(async () => {
    const rawVal = val.toLowerCase();
    setSubdomain(rawVal);

    if (/[^a-z0-9-]/.test(rawVal)) {
      setSubdomainStatus('invalid');
      setSubdomainError('Only English letters, numbers, and hyphens are allowed.');
      return;
    }
    if (rawVal.includes('--')) {
      setSubdomainStatus('invalid');
      setSubdomainError('Consecutive hyphens are not allowed.');
      return;
    }
    if (rawVal.startsWith('-')) {
      setSubdomainStatus('invalid');
      setSubdomainError('Cannot start with a hyphen.');
      return;
    }
    if (rawVal.endsWith('-')) {
      setSubdomainStatus('invalid');
      setSubdomainError('Cannot end with a hyphen.');
      return;
    }
    if (rawVal.length > 50) {
      setSubdomainStatus('invalid');
      setSubdomainError('Maximum length is 50 characters.');
      return;
    }
    if (rawVal.length < 3) {
      setSubdomainStatus('invalid');
      setSubdomainError(t('err_subdomain_length'));
      return;
    }

    setSubdomainStatus('checking');
    setSubdomainError('');`;

code = code.replace(oldHandleNext, newHandleNext);
code = code.replace(oldHandleStoreAndSubdomain, newHandleStoreAndSubdomain);

// Also need to update the fetch call from \`cleanVal\` to \`rawVal\`
const oldFetch = 'const response = await fetch(`${API_BASE_URL}/api/store/check-subdomain/${cleanVal}`);';
const newFetch = 'const response = await fetch(`${API_BASE_URL}/api/store/check-subdomain/${rawVal}`);';
code = code.replace(oldFetch, newFetch);

fs.writeFileSync('src/components/OnboardingModal.jsx', code);
console.log('Updated OnboardingModal.jsx successfully');
