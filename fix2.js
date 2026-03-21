const fs = require('fs');

// ===== patch index.html =====
let html = fs.readFileSync('public/index.html', 'utf8');

// Title
html = html.replace('<title>My World</title>', '<title>LTI - LouayTechnologies.Inc</title>');

// Auth modal
html = html.replace(
  '<div class="auth-title" data-i18n="auth.title">Welcome</div>',
  '<div class="auth-title" data-i18n="auth.title">Welcome To LTI</div>'
);
html = html.replace(
  '<div class="auth-sub" data-i18n="auth.subtitle">Enter my world</div>',
  '<div class="auth-sub" data-i18n="auth.subtitle">LouayTechnologies.Inc</div>'
);

// Brand titles (all of them)
html = html.replace(/<div class="brand-title">My World<\/div>/g, '<div class="brand-title">LTI</div>');
html = html.replace(/<span class="brand-title">My World<\/span>/g, '<span class="brand-title">LTI</span>');

// Brand subs
html = html.replace(/Memes \+ Moments/g, 'LouayTechnologies.Inc');

// Products section title
html = html.replace(
  '<h2 data-i18n="products.title">Louay Products</h2>',
  '<h2 data-i18n="products.title">LTI Products</h2>'
);

// Add footer before </body>
html = html.replace(
  '</body>',
  `  <footer style="text-align:center;padding:18px;color:#666;font-size:13px;margin-top:20px;">
    This website was made by <strong>louay_.idk</strong> 60% and <strong>Claude</strong> 40% 🐱
  </footer>
</body>`
);

fs.writeFileSync('public/index.html', html);
console.log('index.html patched!');
console.log('LTI title:', html.includes('LTI - LouayTechnologies.Inc'));
console.log('Welcome To LTI:', html.includes('Welcome To LTI'));
console.log('footer:', html.includes('louay_.idk'));

// ===== check app.js login flow =====
let app = fs.readFileSync('public/app.js', 'utf8');

// Make sure setToken is called after BOTH login and register
const loginFixed = app.includes("setToken(data.token)");

console.log('\napp.js checks:');
console.log('setToken in login:', loginFixed);
console.log('getToken:', app.includes('getToken'));
console.log('x-auth-token:', app.includes('x-auth-token'));
console.log('clearToken in logout:', app.includes('clearToken()'));

// Fix: make sure setToken called after register too
if (!app.includes("setToken(data.token)")) {
  console.log('FIXING setToken...');
  app = app.replace(
    "state.user = user;\n      localStorage.setItem('savedEmail'",
    "state.user = user;\n      setToken(data.token);\n      localStorage.setItem('savedEmail'"
  );
  fs.writeFileSync('public/app.js', app);
  console.log('app.js re-patched!');
}

// Fix apiFetch to handle token response
if (!app.includes('if (data.token) setToken(data.token)')) {
  app = fs.readFileSync('public/app.js', 'utf8');
  app = app.replace(
    'if (!res.ok) {\n    throw new Error(data.error',
    'if (data.token) setToken(data.token);\n  if (!res.ok) {\n    throw new Error(data.error'
  );
  fs.writeFileSync('public/app.js', app);
  console.log('apiFetch token auto-save patched!');
}

console.log('\nAll done! Run: git add . && git commit -m "fix: LTI branding + JWT" && git push');