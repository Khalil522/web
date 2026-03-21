const fs = require('fs');
let a = fs.readFileSync('public/app.js', 'utf8');
a = a.replace(/\r\n/g, '\n');

// شوف السطر 258
const lines = a.split('\n');
console.log('line 255:', lines[254]);
console.log('line 256:', lines[255]);
console.log('line 257:', lines[256]);
console.log('line 258:', lines[257]);
console.log('line 259:', lines[258]);
console.log('line 260:', lines[259]);

// عدد const token
const count = (a.match(/const token/g) || []).length;
console.log('const token count:', count);

// بدّل const _t بدل const token في bootstrap
a = a.replace(
  "    const _t = getToken();\n    if (!_t) { showAuth(); return; }",
  "    const _authTok = getToken();\n    if (!_authTok) { showAuth(); return; }"
);

// بدّل const token = getToken() لو موجودة
a = a.replace(
  "    const token = getToken();\n    if (!token) { showAuth(); return; }",
  "    const _authTok = getToken();\n    if (!_authTok) { showAuth(); return; }"
);

// بدّل في apiFetch لو في const token
a = a.replace(
  "  const token = getToken();\n  if (token) {",
  "  const _tok = getToken();\n  if (_tok) {"
);
a = a.replace(
  "    options.headers['x-auth-token'] = token;",
  "    options.headers['x-auth-token'] = _tok;"
);

fs.writeFileSync('public/app.js', a, 'utf8');
console.log('\nfixed! const token count now:', (a.match(/const token/g) || []).length);
console.log('const _tok:', (a.match(/const _tok/g) || []).length);