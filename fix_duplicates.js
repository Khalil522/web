const fs = require('fs');

// admin.js has loadSettings + refreshAll which belong in api.js
// Remove them from admin.js
let admin = fs.readFileSync('public/js/admin.js', 'utf8');
admin = admin.replace(/\r\n/g, '\n');

// Find and remove loadSettings and everything after it that's not renderAdminUsers
// Keep only renderAdminUsers and loadAdminUsers
const renderStart = admin.indexOf('const renderAdminUsers');
const loadAdminStart = admin.indexOf('const loadAdminUsers');

if (renderStart > 0) {
  // Keep only from renderAdminUsers onwards
  admin = admin.slice(renderStart);
  fs.writeFileSync('public/js/admin.js', admin, 'utf8');
  console.log('✅ admin.js cleaned - kept only renderAdminUsers + loadAdminUsers');
  console.log('Lines:', admin.split('\n').length);
} else {
  console.log('⚠️ renderAdminUsers not found');
}

// Also make utils.js safe - wrap all render calls in typeof checks
let utils = fs.readFileSync('public/js/utils.js', 'utf8');
utils = utils.replace(/\r\n/g, '\n');

// Fix applyTranslations to safely call render functions
utils = utils.replace(
  'renderFeed();',
  'if(typeof renderFeed==="function") renderFeed();'
);
utils = utils.replace(
  'renderProducts();',
  'if(typeof renderProducts==="function") renderProducts();'
);
utils = utils.replace(
  'renderConversations();',
  'if(typeof renderConversations==="function") renderConversations();'
);
utils = utils.replace(
  'renderUsersSelect();',
  'if(typeof renderUsersSelect==="function") renderUsersSelect();'
);
utils = utils.replace(
  'renderGroupUserList();',
  'if(typeof renderGroupUserList==="function") renderGroupUserList();'
);
utils = utils.replace(
  'renderAdminUsers();',
  'if(typeof renderAdminUsers==="function") renderAdminUsers();'
);

fs.writeFileSync('public/js/utils.js', utils, 'utf8');
console.log('✅ utils.js - safe render calls');

console.log('\ngit add . && git commit -m "fix: remove duplicate functions" && git push');