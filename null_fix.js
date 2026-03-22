const fs = require('fs');
console.log('🔧 Fixing null errors...\n');

let app = fs.readFileSync('public/app.js', 'utf8');
app = app.replace(/\r\n/g, '\n');

// Find all .textContent = assignments and wrap them safely
// The error is "Cannot set properties of null (setting 'textContent')"
// Most likely from heroTitle, heroSubtitle, aboutText, statMemes, statPosts, statFriends

const fixes = [
  // loadSettings
  ["$('#heroTitle').textContent", "if($('#heroTitle')) $('#heroTitle').textContent"],
  ["$('#heroSubtitle').textContent", "if($('#heroSubtitle')) $('#heroSubtitle').textContent"],
  ["$('#aboutText').textContent", "if($('#aboutText')) $('#aboutText').textContent"],
  // refreshStats
  ["$('#statMemes').textContent", "if($('#statMemes')) $('#statMemes').textContent"],
  ["$('#statPosts').textContent", "if($('#statPosts')) $('#statPosts').textContent"],
  ["$('#statFriends').textContent", "if($('#statFriends')) $('#statFriends').textContent"],
  // convoHeader
  ["$('#convoHeader').textContent = convo.display_name;", "if($('#convoHeader')) $('#convoHeader').textContent = convo.display_name;"],
  // welcomeUsername
  ["welcomeUsername.textContent =", "if(welcomeUsername) welcomeUsername.textContent ="],
  // sideUserName  
  ["sideUserName.textContent =", "if(sideUserName) sideUserName.textContent ="],
  // welcomeGreeting
  ["greeting.textContent =", "if(greeting) greeting.textContent ="],
];

let fixCount = 0;
fixes.forEach(([from, to]) => {
  if (app.includes(from) && from !== to) {
    app = app.replaceAll(from, to);
    fixCount++;
    console.log('✅ Fixed:', from.slice(0, 50));
  }
});

// Fix loadSettings specifically - it crashes when heroTitle doesn't exist
app = app.replace(
  `const loadSettings = async () => {
  const { settings } = await apiFetch('/api/settings');
  state.settings = settings;
  $('#heroTitle').textContent = settings.hero_title || '';
  $('#heroSubtitle').textContent = settings.hero_subtitle || '';
  $('#aboutText').textContent = settings.about_text || '';`,
  `const loadSettings = async () => {
  const { settings } = await apiFetch('/api/settings');
  state.settings = settings;
  if ($('#heroTitle')) $('#heroTitle').textContent = settings.hero_title || '';
  if ($('#heroSubtitle')) $('#heroSubtitle').textContent = settings.hero_subtitle || '';
  if ($('#aboutText')) $('#aboutText').textContent = settings.about_text || '';`
);

// Fix refreshStats - wrap ALL stat elements
app = app.replace(
  `const refreshStats = () => {
  const memeCount = state.products.length;
  const postCount = state.posts.length;
  const friendCount = state.users.length;
  $('#statMemes').textContent = String(memeCount);
  $('#statPosts').textContent = String(postCount);
  $('#statFriends').textContent = String(friendCount);`,
  `const refreshStats = () => {
  const memeCount = state.products.length;
  const postCount = state.posts.length;
  const friendCount = state.users.length;
  if ($('#statMemes')) $('#statMemes').textContent = String(memeCount);
  if ($('#statPosts')) $('#statPosts').textContent = String(postCount);
  if ($('#statFriends')) $('#statFriends').textContent = String(friendCount);`
);

// Fix profileStatProducts, profileStatPosts, profileStatFriends
app = app.replace(
  `  const profileProducts = $('#profileStatProducts');
  if (profileProducts) profileProducts.textContent = String(myProducts);
  const profilePosts = $('#profileStatPosts');
  if (profilePosts) profilePosts.textContent = String(myPosts);
  const profileFriends = $('#profileStatFriends');
  if (profileFriends) profileFriends.textContent = String(friendCount);`,
  `  if ($('#profileStatProducts')) $('#profileStatProducts').textContent = String(myProducts);
  if ($('#profileStatPosts')) $('#profileStatPosts').textContent = String(myPosts);
  if ($('#profileStatFriends')) $('#profileStatFriends').textContent = String(friendCount);`
);

// Fix onLogin - settingsForm elements
app = app.replace(
  `$('#settingsForm [name="hero_title"]').value = settings.hero_title || '';
    $('#settingsForm [name="hero_subtitle"]').value = settings.hero_subtitle || '';
    $('#settingsForm [name="about_text"]').value = settings.about_text || '';`,
  `if ($('#settingsForm [name="hero_title"]')) $('#settingsForm [name="hero_title"]').value = settings.hero_title || '';
    if ($('#settingsForm [name="hero_subtitle"]')) $('#settingsForm [name="hero_subtitle"]').value = settings.hero_subtitle || '';
    if ($('#settingsForm [name="about_text"]')) $('#settingsForm [name="about_text"]').value = settings.about_text || '';`
);

// Fix profileForm elements in onLogin
app = app.replace(
  `$('#profileForm [name="displayName"]').value = state.user.display_name || '';
  $('#profileForm [name="bio"]').value = state.user.bio || '';`,
  `if ($('#profileForm [name="displayName"]')) $('#profileForm [name="displayName"]').value = state.user.display_name || '';
  if ($('#profileForm [name="bio"]')) $('#profileForm [name="bio"]').value = state.user.bio || '';`
);

// Fix themeForm elements in onLogin
app = app.replace(
  `  const themeForm = $('#themeForm');
  if (themeForm) {
    themeForm.themeAccent.value =`,
  `  const themeForm = $('#themeForm');
  if (themeForm && themeForm.themeAccent) {
    themeForm.themeAccent.value =`
);

// Fix convoStatus null
app = app.replace(
  `  const status = $('#convoStatus');
  if (status) {
    status.textContent = convo.is_group`,
  `  const status = $('#convoStatus');
  if (status && convo) {
    status.textContent = convo.is_group`
);

// Make sure welcomeUsername update is fully null-safe
app = app.replace(
  `  // welcome banner
  const welcomeUsername = $('#welcomeUsername');
  if (welcomeUsername) welcomeUsername.textContent = state.user.display_name || '';`,
  `  // welcome banner
  const welcomeUsername = $('#welcomeUsername');
  if (welcomeUsername) welcomeUsername.textContent = state.user?.display_name || '';`
);

console.log(`\nTotal fixes applied: ${fixCount}`);
fs.writeFileSync('public/app.js', app, { encoding: 'utf8' });
console.log('✅ app.js null-proofed!\n');

// Also fix the post form - "Admin only" tooltip issue
// The post button shows "Admin only" - need to remove that restriction
let html = fs.readFileSync('public/index.html', 'utf8');
html = html.replace(/\r\n/g, '\n');

// Remove tooltip if exists
html = html.replace(' title="Admin only"', '');
html = html.replace(/ data-tooltip="Admin only"/g, '');

fs.writeFileSync('public/index.html', html, { encoding: 'utf8' });
console.log('✅ index.html cleaned\n');

console.log('Now run:');
console.log('git add .');
console.log('git commit -m "fix: null safety for all DOM elements"');
console.log('git push');