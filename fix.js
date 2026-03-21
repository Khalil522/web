const fs = require('fs');

// ===== patch app.js =====
let a = fs.readFileSync('public/app.js', 'utf8');

a = a.replace(
  'const $ = (sel)',
  `const getToken = () => localStorage.getItem('auth_token');
const setToken = (t) => { if (t) localStorage.setItem('auth_token', t); };
const clearToken = () => localStorage.removeItem('auth_token');

const $ = (sel)`
);

a = a.replace(
  'const apiFetch = async (url, options = {}) => {',
  `const apiFetch = async (url, options = {}) => {
  const token = getToken();
  if (token) { options.headers = options.headers || {}; options.headers['x-auth-token'] = token; }`
);

a = a.replace(
  "state.user = user;\n      localStorage.setItem('savedEmail'",
  "state.user = user;\n      setToken(data.token);\n      localStorage.setItem('savedEmail'"
);

a = a.replace(
  "try {\n    const { user } = await apiFetch('/api/auth/me');",
  "try {\n    const token = getToken();\n    if (!token) { showAuth(); return; }\n    const { user } = await apiFetch('/api/auth/me');"
);

// fix logout - first logout button
a = a.replace(
  "await apiFetch('/api/auth/logout', { method: 'POST' });\n    state.user = null;\n    showAuth();\n  });\n  $('#logoutBtnMobile')",
  "await apiFetch('/api/auth/logout', { method: 'POST' });\n    clearToken();\n    state.user = null;\n    showAuth();\n  });\n  $('#logoutBtnMobile')"
);

fs.writeFileSync('public/app.js', a);
console.log('app.js patched!');
console.log('getToken:', a.includes('getToken'));
console.log('setToken:', a.includes('setToken'));
console.log('x-auth-token:', a.includes('x-auth-token'));

// ===== replace api/index.js =====
const newIndex = fs.readFileSync('index_jwt.js', 'utf8');
fs.writeFileSync('api/index.js', newIndex);
console.log('api/index.js replaced! size:', fs.statSync('api/index.js').size);
