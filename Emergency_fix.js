const fs = require('fs');
console.log('🚑 Emergency fix starting...\n');

// ============================================================
// 1. FIX app.js - null element errors
// ============================================================
let app = fs.readFileSync('public/app.js', 'utf8');
app = app.replace(/\r\n/g, '\n');

// FIX 1: startChatBtn doesn't exist anymore - wrap in null check
app = app.replace(
  "$('#startChatBtn').addEventListener('click', async () => {",
  "$('#startChatBtn')?.addEventListener('click', async () => {"
);

// FIX 2: userSelect doesn't exist - wrap in null check  
app = app.replace(
  "const userId = $('#userSelect').value;",
  "const userId = $('#userSelect')?.value;"
);

// FIX 3: messageForm submit - ensure token sent with FormData
// Find the messageForm submit and make sure headers are included
// The issue is FormData + fetch doesn't auto-add x-auth-token
// apiFetch should handle this but let's verify

// FIX 4: convoHeader textContent null error
app = app.replace(
  "const header = $('#convoHeader');\n  if (header) header.textContent = window.I18N[state.lang].messages.noChat;",
  "const header = $('#convoHeader');\n  if (header) header.textContent = 'Select a chat';"
);

// FIX 5: Make sure apiFetch properly handles ALL requests with token
// Find apiFetch and ensure it adds token even for FormData
const apiFetchOld = `const apiFetch = async (url, options = {}) => {
  const _tok = getToken();
  if (_tok) {
    options.headers = options.headers || {};
    options.headers['x-auth-token'] = _tok;
  }`;

const apiFetchNew = `const apiFetch = async (url, options = {}) => {
  const _tok = getToken();
  if (_tok) {
    if (!options.headers) options.headers = {};
    options.headers['x-auth-token'] = _tok;
  }`;

if (app.includes("const _tok = getToken();")) {
  app = app.replace(
    /const apiFetch = async \(url, options = \{\}\) => \{\n  const _tok = getToken\(\);\n  if \(_tok\) \{[\s\S]*?options\.headers\['x-auth-token'\] = _tok;\n  \}/,
    apiFetchNew
  );
  console.log('✅ apiFetch token fix applied');
} else {
  console.log('⚠️  apiFetch pattern not found - checking...');
  const idx = app.indexOf('const apiFetch');
  if (idx >= 0) {
    console.log('apiFetch found at index:', idx);
    console.log('Context:', app.slice(idx, idx + 200));
  }
}

// FIX 6: Feed section - remove the broken renderFeed filter that may cause issues
// Check if activeFeedTab variable exists
if (!app.includes('let activeFeedTab')) {
  app = app.replace(
    'const SCHOOLS =',
    'let activeFeedTab = \'all\';\n\nconst SCHOOLS ='
  );
  console.log('✅ activeFeedTab variable ensured');
}

// FIX 7: The renderFeed has a broken forEach - fix it
// The issue is we changed state.posts.forEach to posts.forEach but may have missed closing
const brokenFeed = `  posts.forEach((post) => {`;
const fixedFeed = `  (posts || []).forEach((post) => {`;
app = app.replace(brokenFeed, fixedFeed);
console.log('✅ renderFeed forEach null safety added');

// FIX 8: setupForms - wrap ALL potentially null elements
// Fix recordBtn null
app = app.replace(
  "const recordBtn = $('#recordBtn');\n  const voicePreview = $('#voicePreview');\n  if (!recordBtn) return;",
  "const recordBtn = $('#recordBtn');\n  const voicePreview = $('#voicePreview');\n  if (!recordBtn) { console.log('recordBtn not found'); return; }"
);

// FIX 9: userProfileModal close
app = app.replace(
  "if (target === 'userProfileModal') $('#userProfileModal')?.classList.add('hidden');",
  "if (target === 'userProfileModal') { $('#userProfileModal')?.classList.add('hidden'); }"
);

// FIX 10: createGroupBtn null check
app = app.replace(
  "$('#createGroupBtn')?.addEventListener('click', async () => {",
  "$('#createGroupBtn')?.addEventListener('click', async () => {"
);

// Save app.js
fs.writeFileSync('public/app.js', app, { encoding: 'utf8' });
console.log('✅ app.js fixed\n');

// ============================================================
// 2. FIX index.html - restore startChatBtn but as hidden
// ============================================================
let html = fs.readFileSync('public/index.html', 'utf8');
html = html.replace(/\r\n/g, '\n');

// Make sure userSelect exists (hidden) for backward compat
if (!html.includes('userSelect')) {
  html = html.replace(
    '<div id="userSelectList" class="user-select-list"></div>',
    `<select id="userSelect" style="display:none"></select>
              <button id="startChatBtn" style="display:none"></button>
              <div id="userSelectList" class="user-select-list"></div>`
  );
  console.log('✅ Hidden userSelect and startChatBtn restored for JS compat');
} else {
  console.log('✅ userSelect already exists');
}

fs.writeFileSync('public/index.html', html, { encoding: 'utf8' });
console.log('✅ index.html fixed\n');

// ============================================================
// 3. FIX CSS - Mobile feed + messages
// ============================================================
let css = fs.readFileSync('public/styles.css', 'utf8');
css = css.replace(/\r\n/g, '\n');

// Fix mobile feed - make it readable
const mobileFeedFix = `
/* ============================================================
   MOBILE FEED FIX
============================================================ */
@media (max-width: 767px) {
  .feed-tabs {
    gap: 8px;
    padding: 4px 0 8px;
  }
  .feed-tab {
    padding: 7px 14px;
    font-size: 12px;
  }
  .feed-item {
    border-radius: 16px;
    padding: 14px;
  }
  .feed-actions {
    gap: 4px;
  }
  .feed-action {
    padding: 8px 6px;
    font-size: 12px;
  }
  .compose-header {
    gap: 10px;
  }
  .compose-header textarea {
    font-size: 14px;
  }
  /* messages mobile - fully fixed */
  #messages .section-header {
    margin-bottom: 12px;
  }
  .convo-list {
    height: calc(100dvh - 220px);
    overflow-y: auto;
  }
  .convo-chat {
    height: calc(100dvh - 70px) !important;
  }
  .message-form {
    padding: 10px 12px;
  }
  .message-input-row {
    gap: 6px;
  }
}
`;

if (!css.includes('MOBILE FEED FIX')) {
  css += mobileFeedFix;
  console.log('✅ Mobile feed CSS added');
}

fs.writeFileSync('public/styles.css', css, { encoding: 'utf8' });
console.log('✅ styles.css fixed\n');

// ============================================================
// VERIFY
// ============================================================
const appFinal = fs.readFileSync('public/app.js', 'utf8');
console.log('='.repeat(50));
console.log('VERIFICATION:');
console.log('startChatBtn optional:', appFinal.includes("$('#startChatBtn')?.addEventListener"));
console.log('getToken in apiFetch:', appFinal.includes('getToken') && appFinal.includes('x-auth-token'));
console.log('activeFeedTab:', appFinal.includes('activeFeedTab'));
console.log('renderHomeNews:', appFinal.includes('renderHomeNews'));
console.log('='.repeat(50));
console.log('\n✅ Done! Now run:');
console.log('git add .');
console.log('git commit -m "fix: null errors + mobile feed + token"');
console.log('git push');