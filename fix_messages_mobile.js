const fs = require('fs');

// Fix styles.css - improve mobile messages
let css = fs.readFileSync('public/styles.css', 'utf8');
css = css.replace(/\r\n/g, '\n');

// Replace mobile messages section
const oldMobile = `.convo-chat{height:58dvh}
  .convo-list{max-height:280px}`;
const newMobile = `.convo-chat{height:calc(100dvh - 280px);min-height:400px}
  .convo-list{max-height:260px}`;

css = css.replace(oldMobile, newMobile);

// Fix messages layout on mobile - full screen chat
const oldMsgLayout = `.messages-layout{grid-template-columns:1fr;height:auto}`;
const newMsgLayout = `.messages-layout{grid-template-columns:1fr;height:auto;display:flex;flex-direction:column;gap:10px}`;
css = css.replace(oldMsgLayout, newMsgLayout);

// Better message form on mobile
if (!css.includes('message-input-row input { font-size: 16px }')) {
  css += `
/* Mobile message fixes */
@media (max-width:767px) {
  .message-input-row input { font-size: 16px; } /* prevent zoom on iOS */
  .message-list { padding: 10px 12px; }
  .message-bubble { max-width: 85%; font-size: 14px; }
  .convo-list { overflow-y: auto; }
  .messages-layout { gap: 8px; }
  /* when chat is open, hide convo list on mobile */
  .messages-layout.chat-open .convo-list { display: none; }
  .messages-layout.chat-open .convo-chat { height: calc(100dvh - 170px); }
  /* back button for mobile */
  .chat-back-btn { display: flex !important; }
}
.chat-back-btn { display: none; align-items:center; gap:6px; background:transparent; border:none; color:var(--muted-2); font-size:14px; font-weight:600; cursor:pointer; padding:0; }
.chat-back-btn:hover { color:var(--text); }
.chat-back-btn .material-symbols-rounded { font-size:20px; }
`;
}

fs.writeFileSync('public/styles.css', css, { encoding: 'utf8' });
console.log('✅ styles.css - mobile messages fixed');

// Fix app.js - add back button and mobile chat toggle
let app = fs.readFileSync('public/app.js', 'utf8');
app = app.replace(/\r\n/g, '\n');

// Add mobile back button logic to openConversation
if (!app.includes('chat-open')) {
  app = app.replace(
    'const openConversation = async (convo) => {\n  if (!convo) return;',
    `const openConversation = async (convo) => {
  if (!convo) return;
  // mobile: show chat, hide list
  const layout = document.querySelector('.messages-layout');
  if (layout && window.innerWidth < 768) {
    layout.classList.add('chat-open');
  }`
  );
  console.log('✅ app.js - mobile chat open added');
}

// Add back button to chat header in renderMessages or openConversation
if (!app.includes('chatBackBtn')) {
  app = app.replace(
    "  $('#convoHeader').textContent = convo.display_name;",
    `  $('#convoHeader').textContent = convo.display_name;
  // add back button on mobile
  const chatHeader = $('.chat-header');
  if (chatHeader && !chatHeader.querySelector('.chat-back-btn')) {
    const backBtn = document.createElement('button');
    backBtn.className = 'chat-back-btn';
    backBtn.innerHTML = '<span class="material-symbols-rounded">arrow_back_ios</span>';
    backBtn.id = 'chatBackBtn';
    backBtn.addEventListener('click', () => {
      const layout = document.querySelector('.messages-layout');
      if (layout) layout.classList.remove('chat-open');
      state.activeConvoId = null;
      state.activeConversation = null;
      $('#messageForm')?.classList.add('hidden');
    });
    chatHeader.insertBefore(backBtn, chatHeader.firstChild);
  }`
  );
  console.log('✅ app.js - back button logic added');
}

fs.writeFileSync('public/app.js', app, { encoding: 'utf8' });
console.log('✅ app.js - mobile chat fixes applied');
console.log('\nNow run:');
console.log('git add .');
console.log('git commit -m "fix: mobile messages + storage RLS + owner login"');
console.log('git push');