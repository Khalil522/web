const fs = require('fs');
console.log('⚡ Speed + null fix starting...\n');

// ============================================================
// FIX main.js - null safety + faster polling
// ============================================================
let main = fs.readFileSync('public/js/main.js', 'utf8');
main = main.replace(/\r\n/g, '\n');

// Fix refreshStats null
main = main.replace(
  "  $('#statMemes').textContent = String(memeCount);",
  "  if($('#statMemes')) $('#statMemes').textContent = String(memeCount);"
);
main = main.replace(
  "  $('#statPosts').textContent = String(postCount);",
  "  if($('#statPosts')) $('#statPosts').textContent = String(postCount);"
);
main = main.replace(
  "  $('#statFriends').textContent = String(friendCount);",
  "  if($('#statFriends')) $('#statFriends').textContent = String(friendCount);"
);

// Speed up polling from 8000 to 2000ms
main = main.replace(/}, 8000\)/g, '}, 2000)');
main = main.replace(/}, 4000\)/g, '}, 2000)');

fs.writeFileSync('public/js/main.js', main, 'utf8');
console.log('✅ main.js fixed');

// ============================================================
// FIX utils.js - null safety for textContent
// ============================================================
let utils = fs.readFileSync('public/js/utils.js', 'utf8');
utils = utils.replace(/\r\n/g, '\n');

// Fix heroTitle etc
utils = utils.replace(
  "$('#heroTitle').textContent",
  "if($('#heroTitle')) $('#heroTitle').textContent"
);
utils = utils.replace(
  "$('#heroSubtitle').textContent",
  "if($('#heroSubtitle')) $('#heroSubtitle').textContent"
);
utils = utils.replace(
  "$('#aboutText').textContent",
  "if($('#aboutText')) $('#aboutText').textContent"
);

// Fix convoHeader
utils = utils.replace(
  "  $('#convoHeader').textContent",
  "  if($('#convoHeader')) $('#convoHeader').textContent"
);

fs.writeFileSync('public/js/utils.js', utils, 'utf8');
console.log('✅ utils.js null-proofed');

// ============================================================
// FIX api.js - add loaders + fix logout
// ============================================================
let api = fs.readFileSync('public/js/api.js', 'utf8');
api = api.replace(/\r\n/g, '\n');

// Add loaders if missing
if (!api.includes('loadSettings')) {
  api += `
const loadSettings = async () => {
  const { settings } = await apiFetch('/api/settings');
  state.settings = settings;
  if ($('#heroTitle')) $('#heroTitle').textContent = settings.hero_title || '';
  if ($('#heroSubtitle')) $('#heroSubtitle').textContent = settings.hero_subtitle || '';
  if ($('#aboutText')) $('#aboutText').textContent = settings.about_text || '';
};
const loadUsers = async () => {
  const { users } = await apiFetch('/api/users');
  state.users = users;
  if(typeof renderUsersSelect === 'function') renderUsersSelect();
  if(typeof renderUserSelectList === 'function') renderUserSelectList();
  if(typeof renderGroupUserList === 'function') renderGroupUserList();
  refreshStats();
};
const loadProducts = async () => {
  const { products } = await apiFetch('/api/products');
  state.products = products;
  if(typeof renderProducts === 'function') renderProducts();
  refreshStats();
};
const loadPosts = async () => {
  const { posts } = await apiFetch('/api/posts');
  state.posts = posts;
  if(typeof renderFeed === 'function') renderFeed();
  if(typeof renderHomeNews === 'function') renderHomeNews();
  refreshStats();
};
const loadConversations = async () => {
  const { conversations } = await apiFetch('/api/conversations');
  state.conversations = conversations;
  state.activeConversation = state.conversations.find(c => c.id === state.activeConvoId) || null;
  if (!state.activeConversation) {
    state.activeConvoId = null;
    if ($('#convoHeader')) $('#convoHeader').textContent = 'Select a chat';
    $('#messageForm')?.classList.add('hidden');
  }
  if(typeof renderConversations === 'function') renderConversations();
  if(typeof renderShareConversations === 'function') renderShareConversations();
};
const loadAdminUsers = async () => {
  if (!state.user || !(state.user.is_owner || state.user.is_admin)) return;
  const { users } = await apiFetch('/api/admin/users');
  state.adminUsers = users;
  if(typeof renderAdminUsers === 'function') renderAdminUsers();
};
const refreshAll = async () => {
  await Promise.all([loadSettings(), loadUsers(), loadProducts(), loadPosts(), loadConversations()]);
  await loadAdminUsers();
};
const refreshMessages = async () => {
  if (!state.activeConvoId) return;
  const { messages, otherLastSeenAt, memberCount } = await apiFetch('/api/conversations/' + state.activeConvoId + '/messages');
  if(typeof renderMessages === 'function') renderMessages(messages, otherLastSeenAt);
  const status = $('#convoStatus');
  if (status) {
    if (state.activeConversation?.is_group) {
      status.textContent = (memberCount || 0) + ' members';
    } else {
      status.textContent = otherLastSeenAt ? 'Seen: ' + new Date(otherLastSeenAt).toLocaleString() : '';
    }
  }
};`;
  console.log('✅ api.js - loaders added');
}

fs.writeFileSync('public/js/api.js', api, 'utf8');
console.log('✅ api.js updated');

// ============================================================
// FIX messages.js - messages section null header
// ============================================================
let msgs = fs.readFileSync('public/js/messages.js', 'utf8');
msgs = msgs.replace(/\r\n/g, '\n');

// Fix openConversation - make messages instant
if (msgs.includes('openConversation')) {
  // Add instant message send feedback
  msgs = msgs.replace(
    "  await refreshMessages();\n  await apiFetch(`/api/conversations/${convo.id}/seen`",
    "  await refreshMessages();\n  apiFetch(`/api/conversations/${convo.id}/seen`" // don't await seen
  );
  console.log('✅ messages.js - instant feel improved');
}

fs.writeFileSync('public/js/messages.js', msgs, 'utf8');

// ============================================================
// FIX setup.js - message form instant send
// ============================================================
let setup = fs.readFileSync('public/js/setup.js', 'utf8');
setup = setup.replace(/\r\n/g, '\n');

// Make message sending faster - optimistic UI
if (setup.includes("$('#messageForm')")) {
  setup = setup.replace(
    "      e.target.reset(); clearFileName('messageMedia');\n      await refreshMessages(); await loadConversations();",
    `      e.target.reset(); clearFileName('messageMedia');
      // Optimistic: refresh immediately then update
      refreshMessages();
      loadConversations();`
  );
  console.log('✅ setup.js - optimistic message send');
}

fs.writeFileSync('public/js/setup.js', setup, 'utf8');

console.log('\n✅ All fixed! Run:');
console.log('git add .');
console.log('git commit -m "fix: null errors + speed"');
console.log('git push');
