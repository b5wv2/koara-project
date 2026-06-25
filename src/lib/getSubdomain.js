export function getSubdomain() {
  const hostname = window.location.hostname.toLowerCase();

  const reservedSubdomains = [
    'www', 'api', 'admin', 'dashboard', 'app', 'portal', 
    'auth', 'login', 'register', 'mail', 'support', 'help', 
    'root', 'cdn', 'static', 'blog', 'docs', 'status', 
    'billing', 'system', 'developer', 'developers'
  ];

  const rootDomains = [
    'getkoara.com',
    'localhost',
    '127.0.0.1'
  ];

  // 1. If it's a known root domain, return null
  if (rootDomains.includes(hostname)) {
    return null;
  }

  // 2. Extract potential subdomain
  const parts = hostname.split('.');
  const potentialSubdomain = parts[0];

  // 3. If the potential subdomain is reserved (e.g. 'www'), treat as root
  if (reservedSubdomains.includes(potentialSubdomain)) {
    return null;
  }

  // 4. Return the valid merchant subdomain
  return potentialSubdomain;
}
