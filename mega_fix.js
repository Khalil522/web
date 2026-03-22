const fs = require('fs');

console.log('🚀 Starting THSG mega fix...\n');

// ============================================================
// 1. FIX CSS - Mobile messages + animations + schools
// ============================================================
let css = fs.readFileSync('public/styles.css', 'utf8');
css = css.replace(/\r\n/g, '\n');

// Add all new styles at the end
const newStyles = `

/* ============================================================
   MOBILE MESSAGES - FULL SCREEN CHAT
============================================================ */
@media (max-width: 767px) {
  .messages-layout {
    grid-template-columns: 1fr !important;
    height: calc(100dvh - 160px) !important;
    position: relative;
    overflow: hidden;
  }
  .convo-list {
    width: 100%;
    height: 100%;
    max-height: none !important;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  .convo-chat {
    position: absolute;
    inset: 0;
    z-index: 10;
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    background: var(--bg);
    height: 100% !important;
  }
  .convo-chat.open {
    transform: translateX(0);
  }
  .message-input-row input { font-size: 16px; }
  .message-list { padding: 10px 12px; }
  .message-bubble { max-width: 85%; }
}

/* ============================================================
   BACK BUTTON
============================================================ */
.chat-back-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 34px; height: 34px;
  border-radius: 50%;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--muted-2);
  cursor: pointer;
  transition: all .18s var(--ease);
  flex-shrink: 0;
}
.chat-back-btn:hover { background: var(--surface-hover); color: var(--text); }
.chat-back-btn .material-symbols-rounded { font-size: 18px; }
@media (max-width: 767px) { .chat-back-btn { display: flex; } }

/* ============================================================
   USER LIST IN MESSAGES - CLICKABLE USERS
============================================================ */
.user-select-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 6px;
}
.user-select-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 1px solid transparent;
  transition: all .18s var(--ease);
  background: var(--surface);
}
.user-select-item:hover {
  background: var(--surface-2);
  border-color: rgba(var(--accent-rgb),.20);
}
.user-select-item img {
  width: 36px; height: 36px;
  border-radius: var(--pfp-radius);
  object-fit: cover;
  border: 2px solid var(--border);
  flex-shrink: 0;
}
.user-select-item .user-item-info { flex: 1; min-width: 0; }
.user-select-item .user-item-name { font-size: 13px; font-weight: 600; }
.user-select-item .user-item-role { font-size: 11px; color: var(--muted); }

/* ============================================================
   USER PROFILE MODAL
============================================================ */
.profile-modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 10px 0;
}
.profile-modal-avatar {
  width: 80px; height: 80px;
  border-radius: var(--pfp-radius);
  object-fit: cover;
  border: 3px solid var(--accent);
  box-shadow: 0 0 20px var(--accent-glow);
}
.profile-modal-name { font-size: 20px; font-weight: 800; text-align: center; }
.profile-modal-bio { font-size: 13px; color: var(--muted-2); text-align: center; line-height: 1.5; }
.profile-modal-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 999px;
  background: rgba(var(--accent-rgb),.10);
  border: 1px solid rgba(var(--accent-rgb),.22);
  font-size: 12px; font-weight: 600; color: var(--accent);
}
.profile-modal-stats {
  display: flex; gap: 24px;
  padding: 14px; border-radius: var(--radius-sm);
  background: var(--surface-2);
  width: 100%;
}
.profile-modal-stat { display: flex; flex-direction: column; align-items: center; flex: 1; }
.profile-modal-stat .n { font-size: 18px; font-weight: 800; color: var(--accent); }
.profile-modal-stat .l { font-size: 11px; color: var(--muted); }
.profile-modal-actions { display: flex; gap: 8px; width: 100%; }
.profile-modal-actions button { flex: 1; }

/* ============================================================
   SCHOOLS FEED TABS
============================================================ */
.feed-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: 16px;
  scrollbar-width: none;
}
.feed-tabs::-webkit-scrollbar { display: none; }
.feed-tab {
  flex-shrink: 0;
  padding: 8px 16px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--muted-2);
  font-size: 13px; font-weight: 500;
  cursor: pointer;
  transition: all .18s var(--ease);
  white-space: nowrap;
}
.feed-tab:hover { background: var(--surface-2); color: var(--text); }
.feed-tab.active {
  background: linear-gradient(135deg, rgba(var(--accent-rgb),.15), rgba(167,139,250,.12));
  border-color: rgba(var(--accent-rgb),.30);
  color: var(--accent);
  font-weight: 600;
}

/* ============================================================
   CREDIT BAR
============================================================ */
.credit-bar {
  text-align: center;
  padding: 8px 16px;
  font-size: 11px;
  color: var(--muted);
  background: rgba(255,255,255,.02);
  border-bottom: 1px solid var(--border);
  letter-spacing: .02em;
}
.credit-bar strong { color: var(--accent); }

/* ============================================================
   TEXT ANIMATIONS
============================================================ */
@keyframes typewriter {
  from { width: 0; }
  to { width: 100%; }
}
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes gradientShift {
  0%{background-position:0% 50%}
  50%{background-position:100% 50%}
  100%{background-position:0% 50%}
}
@keyframes float {
  0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)}
}

.brand-title, .auth-logo-title {
  background: linear-gradient(135deg,#fff,var(--accent),var(--accent-2),#fff);
  background-size: 300% 300%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientShift 4s ease infinite;
}
.welcome-name {
  background: linear-gradient(135deg,#fff,var(--accent),var(--accent-2));
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientShift 3s ease infinite;
}
.topbar-logo {
  background: linear-gradient(135deg,#fff,var(--accent));
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientShift 3s ease infinite;
}
.auth-logo-icon { animation: float 3s ease infinite; }

/* ============================================================
   ALLOW ALL USERS TO POST - hide form only for non-logged in
============================================================ */
.post-compose { display: block; }

/* ============================================================
   SEEN INDICATOR
============================================================ */
.seen-indicator {
  font-size: 11px;
  color: var(--accent);
  display: flex;
  align-items: center;
  gap: 3px;
}
.seen-indicator .material-symbols-rounded { font-size: 13px; font-variation-settings:'FILL' 1; }
`;

css += newStyles;
fs.writeFileSync('public/styles.css', css, { encoding: 'utf8' });
console.log('✅ styles.css updated with mobile fix + animations + schools tabs');

// ============================================================
// 2. FIX HTML - Add credit bar, user profile modal, schools
// ============================================================
let html = fs.readFileSync('public/index.html', 'utf8');
html = html.replace(/\r\n/g, '\n');

// Add credit bar after topbar
if (!html.includes('credit-bar')) {
  html = html.replace(
    '</header>\n\n    <main class="main">',
    `</header>
    <div class="credit-bar">
      🎓 This project was made by <strong>louay_.idk</strong> with the help of <strong>AI</strong>
    </div>

    <main class="main">`
  );
  console.log('✅ Credit bar added');
}

// Add user profile modal
if (!html.includes('userProfileModal')) {
  html = html.replace(
    '<div id="lightbox"',
    `<div id="userProfileModal" class="modal hidden">
  <div class="modal-backdrop" data-close="userProfileModal"></div>
  <div class="modal-card">
    <button class="modal-close" data-close="userProfileModal">✕</button>
    <div class="profile-modal-content">
      <img id="profileModalAvatar" class="profile-modal-avatar" alt="pfp" src="" />
      <div id="profileModalName" class="profile-modal-name">—</div>
      <div id="profileModalBio" class="profile-modal-bio muted"></div>
      <div id="profileModalSchool" class="profile-modal-badge hidden">
        <span class="material-symbols-rounded">school</span>
        <span id="profileModalSchoolText">—</span>
      </div>
      <div class="profile-modal-stats">
        <div class="profile-modal-stat">
          <span id="profileModalPosts" class="n">0</span>
          <span class="l">Posts</span>
        </div>
        <div class="profile-modal-stat">
          <span id="profileModalFriends" class="n">0</span>
          <span class="l">Friends</span>
        </div>
      </div>
      <div class="profile-modal-actions">
        <button id="profileModalMsgBtn" class="primary small-btn">
          <span class="material-symbols-rounded">chat_bubble</span> Message
        </button>
      </div>
    </div>
  </div>
</div>

<div id="lightbox"`
  );
  console.log('✅ User profile modal added');
}

// Add feed tabs for schools
if (!html.includes('feed-tabs')) {
  html = html.replace(
    '<div id="feedList" class="feed-list"></div>',
    `<div class="feed-tabs" id="feedTabs">
          <button class="feed-tab active" data-tab="all">🌐 All</button>
          <button class="feed-tab" data-tab="news">📰 News</button>
          <button class="feed-tab" data-tab="maliha">🏫 Maliha Hamidou</button>
          <button class="feed-tab" data-tab="bencerjeb">🏫 Dr. Bencerjeb</button>
          <button class="feed-tab" data-tab="lotfi">🏫 Colonel Lotfi</button>
          <button class="feed-tab" data-tab="ibnkhaldoun">🏫 Ibn Khaldoun</button>
          <button class="feed-tab" data-tab="fatima">🏫 Fatima Boudjlida</button>
        </div>
        <div id="feedList" class="feed-list"></div>`
  );
  console.log('✅ Feed tabs for schools added');
}

// Fix back button in chat header
if (!html.includes('chat-back-btn')) {
  html = html.replace(
    '<div class="chat-header">\n            <img id="chatAvatar"',
    `<div class="chat-header">
            <button class="chat-back-btn" id="chatBackBtn">
              <span class="material-symbols-rounded">arrow_back_ios</span>
            </button>
            <img id="chatAvatar"`
  );
  console.log('✅ Back button added to chat header');
}

// Replace user select with user list
if (!html.includes('user-select-list')) {
  html = html.replace(
    `<div class="convo-new-row">
                <select id="userSelect"></select>
                <button id="startChatBtn" class="primary small-btn" data-i18n="messages.startButton">Go</button>
              </div>`,
    `<div id="userSelectList" class="user-select-list"></div>`
  );
  console.log('✅ User select replaced with visual list');
}

// allow normal users to post - make postFormWrap visible (will be controlled by JS)
html = html.replace(
  '<div id="postFormWrap" class="post-compose panel hidden">',
  '<div id="postFormWrap" class="post-compose panel">'
);

fs.writeFileSync('public/index.html', html, { encoding: 'utf8' });
console.log('✅ index.html updated');

// ============================================================
// 3. FIX APP.JS - All logic fixes
// ============================================================
let app = fs.readFileSync('public/app.js', 'utf8');
app = app.replace(/\r\n/g, '\n');

// ── A. SCHOOLS CONSTANT ──────────────────────────────────────
if (!app.includes('SCHOOLS')) {
  app = app.replace(
    'const state = {',
    `const SCHOOLS = {
  all: { name: 'All', emoji: '🌐' },
  news: { name: 'News', emoji: '📰' },
  maliha: { name: 'Maliha Hamidou', emoji: '🏫' },
  bencerjeb: { name: 'Dr. Bencerjeb', emoji: '🏫' },
  lotfi: { name: 'Colonel Lotfi', emoji: '🏫' },
  ibnkhaldoun: { name: 'Ibn Khaldoun', emoji: '🏫' },
  fatima: { name: 'Fatima Boudjlida', emoji: '🏫' },
};

let activeFeedTab = 'all';

const state = {`
  );
  console.log('✅ SCHOOLS constant added');
}

// ── B. MOBILE CHAT OPEN/CLOSE ─────────────────────────────────
if (!app.includes('convoChat.classList.add')) {
  app = app.replace(
    'const openConversation = async (convo) => {\n  if (!convo) return;',
    `const openConversation = async (convo) => {
  if (!convo) return;
  // mobile: slide in chat panel
  const convoChat = document.querySelector('.convo-chat');
  if (convoChat && window.innerWidth < 768) {
    convoChat.classList.add('open');
  }`
  );
  console.log('✅ Mobile chat open added');
}

// ── C. BACK BUTTON ────────────────────────────────────────────
if (!app.includes("'chatBackBtn'")) {
  app = app.replace(
    "const setupModals = () => {",
    `const setupChatBack = () => {
  const backBtn = $('#chatBackBtn');
  if (!backBtn) return;
  backBtn.addEventListener('click', () => {
    const convoChat = document.querySelector('.convo-chat');
    if (convoChat) convoChat.classList.remove('open');
    state.activeConvoId = null;
    state.activeConversation = null;
    $('#messageForm')?.classList.add('hidden');
    const convoHeader = $('#convoHeader');
    if (convoHeader) convoHeader.textContent = 'Select a chat';
    const chatAvatar = $('#chatAvatar');
    if (chatAvatar) { chatAvatar.classList.add('hidden'); chatAvatar.src = ''; }
    const messageList = $('#messageList');
    if (messageList) messageList.innerHTML = '';
  });
};

const setupModals = () => {`
  );
  console.log('✅ Back button handler added');
}

// ── D. RENDER USERS AS CLICKABLE LIST ─────────────────────────
if (!app.includes('renderUserSelectList')) {
  app = app.replace(
    'const renderUsersSelect = () => {',
    `const renderUserSelectList = () => {
  const list = $('#userSelectList');
  if (!list) return;
  const query = ($('#userSearch')?.value || '').toLowerCase();
  list.innerHTML = '';
  state.users
    .filter((u) => u.id !== state.user?.id)
    .filter((u) => {
      if (!query) return true;
      return u.display_name?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query);
    })
    .forEach((u) => {
      const item = document.createElement('div');
      item.className = 'user-select-item';
      const img = document.createElement('img');
      img.src = u.avatar_url || '';
      img.alt = u.display_name;
      const info = document.createElement('div');
      info.className = 'user-item-info';
      const name = document.createElement('div');
      name.className = 'user-item-name';
      name.textContent = u.display_name;
      if (u.is_owner || u.is_admin) name.classList.add('admin-name');
      const role = document.createElement('div');
      role.className = 'user-item-role';
      role.textContent = u.is_owner ? '👑 Owner' : u.is_admin ? '⚡ Admin' : '👤 Member';
      info.appendChild(name);
      info.appendChild(role);
      item.appendChild(img);
      item.appendChild(info);
      item.addEventListener('click', async () => {
        try {
          const { conversationId } = await apiFetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: u.id })
          });
          await loadConversations();
          const convo = state.conversations.find((c) => c.id === conversationId);
          if (convo) openConversation(convo);
        } catch (err) {
          toast(err.message);
        }
      });
      list.appendChild(item);
    });
};

const renderUsersSelect = () => {`
  );
  console.log('✅ renderUserSelectList added');
}

// ── E. CALL renderUserSelectList IN RELEVANT PLACES ───────────
app = app.replace(
  'renderUsersSelect();\n  renderGroupUserList();',
  'renderUsersSelect();\n  renderUserSelectList();\n  renderGroupUserList();'
);

// ── F. USER SEARCH UPDATE ─────────────────────────────────────
app = app.replace(
  "$('#userSearch')?.addEventListener('input', () => {\n    renderUsersSelect();\n  });",
  `$('#userSearch')?.addEventListener('input', () => {
    renderUsersSelect();
    renderUserSelectList();
  });`
);

// ── G. FEED TABS ──────────────────────────────────────────────
if (!app.includes('activeFeedTab')) {
  // Add feed tab click handler in setupForms or bootstrap
  app = app.replace(
    "const setupMessageSearch = () => {",
    `const setupFeedTabs = () => {
  const tabs = $$('.feed-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeFeedTab = tab.dataset.tab || 'all';
      renderFeed();
    });
  });
};

const setupMessageSearch = () => {`
  );
  console.log('✅ setupFeedTabs added');
}

// ── H. FILTER FEED BY TAB ─────────────────────────────────────
if (!app.includes('activeFeedTab') || !app.includes('filterByTab')) {
  app = app.replace(
    'const renderFeed = () => {\n  const list = $(\'#feedList\');\n  list.innerHTML = \'\';\n  state.posts.forEach((post) => {',
    `const renderFeed = () => {
  const list = $('#feedList');
  list.innerHTML = '';
  let posts = state.posts;
  // filter by tab
  if (activeFeedTab && activeFeedTab !== 'all') {
    if (activeFeedTab === 'news') {
      posts = posts.filter((p) => {
        const u = state.users.find((u) => u.id === p.user_id);
        return u && (u.is_admin || u.is_owner);
      });
    } else {
      const schoolMap = {
        maliha: 'maliha', bencerjeb: 'bencerjeb',
        lotfi: 'lotfi', ibnkhaldoun: 'ibnkhaldoun', fatima: 'fatima'
      };
      const schoolKey = schoolMap[activeFeedTab];
      posts = posts.filter((p) => {
        const u = state.users.find((u) => u.id === p.user_id);
        return u && u.school === schoolKey;
      });
    }
  }
  posts.forEach((post) => {`
  );
  console.log('✅ Feed filter by tab added');
  // close the forEach properly - need to make sure the forEach is closed
  // The original code had state.posts.forEach so we need to make sure the filter works
}

// ── I. SHOW USER PROFILE ON CLICK ─────────────────────────────
if (!app.includes('openUserProfile')) {
  app = app.replace(
    'const openShareModal = (post) => {',
    `const openUserProfile = (userId) => {
  const user = state.users.find((u) => u.id === userId);
  if (!user) return;
  const modal = $('#userProfileModal');
  if (!modal) return;
  const img = $('#profileModalAvatar');
  if (img) img.src = user.avatar_url || '';
  const name = $('#profileModalName');
  if (name) { name.textContent = user.display_name || ''; if (user.is_owner || user.is_admin) name.classList.add('admin-name'); else name.classList.remove('admin-name'); }
  const bio = $('#profileModalBio');
  if (bio) bio.textContent = user.bio || 'No bio yet.';
  const posts = state.posts.filter((p) => p.user_id === userId).length;
  const postsEl = $('#profileModalPosts');
  if (postsEl) postsEl.textContent = String(posts);
  const friendsEl = $('#profileModalFriends');
  if (friendsEl) friendsEl.textContent = String(state.users.length);
  const msgBtn = $('#profileModalMsgBtn');
  if (msgBtn && userId !== state.user?.id) {
    msgBtn.classList.remove('hidden');
    msgBtn.onclick = async () => {
      try {
        const { conversationId } = await apiFetch('/api/conversations', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        modal.classList.add('hidden');
        showSection('messages');
        await loadConversations();
        const convo = state.conversations.find((c) => c.id === conversationId);
        if (convo) openConversation(convo);
      } catch (err) { toast(err.message); }
    };
  } else if (msgBtn) {
    msgBtn.classList.add('hidden');
  }
  modal.classList.remove('hidden');
};

const openShareModal = (post) => {`
  );
  console.log('✅ openUserProfile added');
}

// ── J. MAKE AVATARS CLICKABLE IN FEED ─────────────────────────
app = app.replace(
  "  userWrap.appendChild(avatar);\n\n    const name = document.createElement('span');\n    name.textContent = post.display_name;",
  `  avatar.style.cursor = 'pointer';
    avatar.addEventListener('click', (e) => { e.stopPropagation(); openUserProfile(post.user_id); });
    userWrap.appendChild(avatar);

    const name = document.createElement('span');
    name.textContent = post.display_name;`
);

// ── K. ALLOW ALL USERS TO POST ────────────────────────────────
// Remove the requireAdmin restriction from post form visibility
app = app.replace(
  "$('#postFormWrap').classList.toggle('hidden', !isAdmin);",
  "// All users can post now - postFormWrap always visible"
);
console.log('✅ All users can now post');

// ── L. CLOSE USER PROFILE MODAL ──────────────────────────────
app = app.replace(
  "  document.querySelectorAll('[data-close]').forEach((btn) => {\n    btn.addEventListener('click', () => {\n      const target = btn.dataset.close;\n      if (target === 'lightbox') closeLightbox();\n      if (target === 'shareModal') closeShareModal();",
  `  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.close;
      if (target === 'lightbox') closeLightbox();
      if (target === 'shareModal') closeShareModal();
      if (target === 'userProfileModal') $('#userProfileModal')?.classList.add('hidden');`
);

// ── M. CALL setupChatBack AND setupFeedTabs ───────────────────
app = app.replace(
  'setupLangToggles();\n  setupMessageSearch();\n  setupModals();',
  'setupLangToggles();\n  setupMessageSearch();\n  setupModals();\n  setupChatBack();\n  setupFeedTabs();'
);
console.log('✅ setupChatBack and setupFeedTabs called');

// ── N. FASTER POLLING (4s instead of 8s) ──────────────────────
app = app.replace(
  '}, 8000);',
  '}, 4000);'
);
console.log('✅ Polling speed improved to 4s');

// ── O. SEEN INDICATOR IMPROVED ────────────────────────────────
app = app.replace(
  "timeSpan.textContent = ` · ${time}${seen ? ' · ' + window.I18N[state.lang].labels.seen : ''}`;",
  `if (seen) {
        const seenSpan = document.createElement('span');
        seenSpan.className = 'seen-indicator';
        seenSpan.innerHTML = '· <span class="material-symbols-rounded">done_all</span> Seen';
        meta.appendChild(document.createTextNode(' · ' + time + ' '));
        meta.appendChild(seenSpan);
      } else {
        timeSpan.textContent = ' · ' + time;
      }`
);

fs.writeFileSync('public/app.js', app, { encoding: 'utf8' });
console.log('✅ app.js fully updated!\n');

console.log('='.repeat(50));
console.log('✅ ALL DONE! Now run:');
console.log('git add .');
console.log('git commit -m "feat: mobile chat fix + schools tabs + user profiles + all can post"');
console.log('git push');
console.log('='.repeat(50));
console.log('\n📋 REMINDER - Do these in Supabase SQL Editor:');
console.log('1. Add school column: ALTER TABLE users ADD COLUMN IF NOT EXISTS school TEXT DEFAULT \'\';');
console.log('2. Storage RLS already done (skip if done)');