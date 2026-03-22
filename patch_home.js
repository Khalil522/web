const fs = require('fs');
let app = fs.readFileSync('public/app.js', 'utf8');
app = app.replace(/\r\n/g, '\n');

// ============================================================
// 1. Update welcome greeting in onLogin
// ============================================================
// find updateProfileHeader and add welcome banner update
if (!app.includes('welcomeUsername')) {
  app = app.replace(
    'const updateProfileHeader = () => {\n  if (!state.user) return;\n  const avatar = $(\'#profileAvatar\');\n  if (avatar) {\n    avatar.src = state.user.avatar_url || \'\';\n  }\n  const name = $(\'#profileName\');\n  if (name) name.textContent = state.user.display_name || \'\';\n  const bio = $(\'#profileBio\');\n  if (bio) bio.textContent = state.user.bio || \'\';\n  applyProfileBackground();\n};',
    `const updateProfileHeader = () => {
  if (!state.user) return;
  const avatar = $('#profileAvatar');
  if (avatar) avatar.src = state.user.avatar_url || '';
  const name = $('#profileName');
  if (name) name.textContent = state.user.display_name || '';
  const bio = $('#profileBio');
  if (bio) bio.textContent = state.user.bio || '';
  applyProfileBackground();

  // welcome banner
  const welcomeUsername = $('#welcomeUsername');
  if (welcomeUsername) welcomeUsername.textContent = state.user.display_name || '';
  const welcomeAvatar = $('#welcomeAvatar');
  if (welcomeAvatar) welcomeAvatar.src = state.user.avatar_url || '';
  const sideAvatar = $('#sideAvatar');
  if (sideAvatar) sideAvatar.src = state.user.avatar_url || '';
  const sideUserName = $('#sideUserName');
  if (sideUserName) sideUserName.textContent = state.user.display_name || '';
  const composeAvatar = $('#composeAvatar');
  if (composeAvatar) composeAvatar.src = state.user.avatar_url || '';

  // welcome greeting - different for first login vs return
  const greeting = $('#welcomeGreeting');
  if (greeting) {
    const hour = new Date().getHours();
    if (hour < 12) greeting.textContent = 'Good morning ☀️';
    else if (hour < 17) greeting.textContent = 'Good afternoon 👋';
    else greeting.textContent = 'Good evening 🌙';
  }
};`
  );
  console.log('✅ updateProfileHeader patched with welcome banner');
}

// ============================================================
// 2. Render home news cards from posts
// ============================================================
if (!app.includes('renderHomeNews')) {
  // Add renderHomeNews function before renderProducts
  app = app.replace(
    'const renderProducts = () => {',
    `const renderHomeNews = () => {
  const bigCard = $('#biggestNews');
  const secondCard = $('#secondNews');
  const morePosts = $('#homeMorePosts');
  if (!bigCard) return;

  const posts = state.posts.slice(0, 10);

  if (!posts.length) {
    bigCard.innerHTML = '<div class="news-placeholder"><span class="material-symbols-rounded">newspaper</span><span>No posts yet</span></div>';
    if (secondCard) secondCard.classList.add('hidden');
    if (morePosts) morePosts.innerHTML = '';
    return;
  }

  // Biggest news - first post
  const p0 = posts[0];
  bigCard.innerHTML = '';
  if (p0.media_url && p0.media_type && p0.media_type.startsWith('image/')) {
    const img = document.createElement('img');
    img.className = 'news-img';
    img.src = p0.media_url;
    img.alt = 'news';
    bigCard.appendChild(img);
  }
  const lbl = document.createElement('div');
  lbl.className = 'news-label';
  lbl.textContent = '📰 Latest';
  bigCard.appendChild(lbl);
  const body = document.createElement('div');
  body.className = 'news-body';
  const userRow = document.createElement('div');
  userRow.className = 'news-user';
  const uImg = document.createElement('img');
  uImg.src = p0.avatar_url || '';
  uImg.alt = p0.display_name;
  userRow.appendChild(uImg);
  const uName = document.createElement('span');
  uName.textContent = p0.display_name || 'Unknown';
  if (p0.is_admin || p0.is_owner) uName.classList.add('admin-name');
  userRow.appendChild(uName);
  body.appendChild(userRow);
  const txt = document.createElement('div');
  txt.className = 'news-text';
  txt.textContent = p0.content || '';
  body.appendChild(txt);
  const time = document.createElement('div');
  time.className = 'news-time';
  time.textContent = new Date(p0.created_at).toLocaleString();
  body.appendChild(time);
  bigCard.appendChild(body);
  bigCard.onclick = () => {
    showSection('feed');
    setTimeout(() => {
      const card = document.querySelector('[data-post-id="' + p0.id + '"]');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  };

  // Second news
  if (posts[1] && secondCard) {
    const p1 = posts[1];
    secondCard.classList.remove('hidden');
    secondCard.innerHTML = '';
    if (p1.media_url && p1.media_type && p1.media_type.startsWith('image/')) {
      const img2 = document.createElement('img');
      img2.className = 'news-img-small';
      img2.src = p1.media_url;
      img2.alt = 'news';
      secondCard.appendChild(img2);
    }
    const body2 = document.createElement('div');
    body2.className = 'news-body-small';
    const txt2 = document.createElement('div');
    txt2.className = 'news-text-small';
    txt2.textContent = p1.content || '';
    body2.appendChild(txt2);
    const time2 = document.createElement('div');
    time2.className = 'news-time-small';
    time2.textContent = new Date(p1.created_at).toLocaleString();
    body2.appendChild(time2);
    secondCard.appendChild(body2);
    secondCard.onclick = () => {
      showSection('feed');
      setTimeout(() => {
        const card = document.querySelector('[data-post-id="' + p1.id + '"]');
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    };
  } else if (secondCard) {
    secondCard.classList.add('hidden');
  }

  // More posts (3-10) as mini cards
  if (morePosts) {
    morePosts.innerHTML = '';
    posts.slice(2, 6).forEach((post) => {
      const mini = document.createElement('div');
      mini.className = 'second-news-card';
      if (post.media_url && post.media_type && post.media_type.startsWith('image/')) {
        const img3 = document.createElement('img');
        img3.className = 'news-img-small';
        img3.src = post.media_url;
        img3.alt = 'post';
        mini.appendChild(img3);
      }
      const miniBody = document.createElement('div');
      miniBody.className = 'news-body-small';
      const miniTxt = document.createElement('div');
      miniTxt.className = 'news-text-small';
      miniTxt.textContent = post.content || '';
      miniBody.appendChild(miniTxt);
      const miniTime = document.createElement('div');
      miniTime.className = 'news-time-small';
      miniTime.textContent = new Date(post.created_at).toLocaleString();
      miniBody.appendChild(miniTime);
      mini.appendChild(miniBody);
      mini.onclick = () => {
        showSection('feed');
        setTimeout(() => {
          const card = document.querySelector('[data-post-id="' + post.id + '"]');
          if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
      };
      morePosts.appendChild(mini);
    });
  }
};

const renderProducts = () => {`
  );
  console.log('✅ renderHomeNews function added');
}

// ============================================================
// 3. Call renderHomeNews after loadPosts
// ============================================================
if (!app.includes('renderHomeNews()')) {
  app = app.replace(
    'state.posts = posts;\n  renderFeed();\n  refreshStats();',
    'state.posts = posts;\n  renderFeed();\n  renderHomeNews();\n  refreshStats();'
  );
  console.log('✅ renderHomeNews called in loadPosts');
}

// ============================================================
// 4. Products grid - switch to products-strip for home
// ============================================================
if (!app.includes('productsGrid') || !app.includes('renderProducts')) {
  console.log('⚠️  renderProducts already ok');
}

// ============================================================
// 5. Add product toggle button handler
// ============================================================
if (!app.includes('addProductToggle')) {
  app = app.replace(
    '$(\'#productForm\').addEventListener(\'submit\'',
    `const addProductToggle = $('#addProductToggle');
  if (addProductToggle) {
    addProductToggle.addEventListener('click', () => {
      const wrap = $('#productFormWrap');
      if (wrap) wrap.classList.toggle('hidden');
    });
  }

  $('#productForm').addEventListener('submit'`
  );
  console.log('✅ addProductToggle handler added');
}

// ============================================================
// 6. Show addProductToggle for owners
// ============================================================
if (!app.includes('addProductToggle.classList')) {
  app = app.replace(
    "$(\'#productFormWrap\').classList.toggle(\'hidden\', !isOwner);",
    `$('#productFormWrap').classList.toggle('hidden', !isOwner);
  const prodToggleBtn = $('#addProductToggle');
  if (prodToggleBtn) prodToggleBtn.classList.toggle('hidden', !isOwner);`
  );
  console.log('✅ addProductToggle visibility fixed');
}

fs.writeFileSync('public/app.js', app, { encoding: 'utf8' });
console.log('\n✅ public/app.js patched for new home layout!');
console.log('renderHomeNews:', app.includes('renderHomeNews'));
console.log('welcomeUsername:', app.includes('welcomeUsername'));