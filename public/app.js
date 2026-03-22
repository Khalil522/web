const state = {
  user: null,
  lang: 'en',
  settings: {},
  users: [],
  products: [],
  posts: [],
  conversations: [],
  activeConvoId: null,
  activeConversation: null,
  sharePost: null,
  shareTargetId: null,
  pendingPostId: null,
  refreshTimer: null,
  voiceBlob: null,
  recording: false,
  adminUsers: [],
  activeSection: 'home'
};

const getToken = () => localStorage.getItem('auth_token');
const setToken = (t) => { if (t) localStorage.setItem('auth_token', t); };
const clearToken = () => localStorage.removeItem('auth_token');

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const toastEl = $('#toast');

const toast = (message) => {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2500);
};

const copyText = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall back
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
};

const defaultTheme = {
  accent: '#7dd3fc',
  surface: '#14181f',
  background: '#0b0f14',
  glassOpacity: 0.16,
  cardRadius: 18,
  pfpRadius: 50
};

const hexToRgba = (hex, alpha) => {
  if (!hex) return `rgba(20, 24, 31, ${alpha})`;
  const clean = hex.replace('#', '');
  const value = clean.length === 3
    ? clean
        .split('')
        .map((c) => c + c)
        .join('')
    : clean;
  const num = parseInt(value, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const shadeColor = (hex, percent) => {
  const clean = hex.replace('#', '');
  const value = clean.length === 3
    ? clean
        .split('')
        .map((c) => c + c)
        .join('')
    : clean;
  const num = parseInt(value, 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;
  r = Math.max(0, Math.min(255, Math.round(r + (percent / 100) * 255)));
  g = Math.max(0, Math.min(255, Math.round(g + (percent / 100) * 255)));
  b = Math.max(0, Math.min(255, Math.round(b + (percent / 100) * 255)));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

const applyTheme = (user) => {
  const accent = user?.theme_accent || defaultTheme.accent;
  const surface = user?.theme_surface || defaultTheme.surface;
  const background = user?.theme_bg || defaultTheme.background;
  const glassOpacity = Number.isFinite(user?.glass_opacity)
    ? Math.min(0.3, Math.max(0.08, user.glass_opacity))
    : defaultTheme.glassOpacity;
  const cardRadius = Number.isFinite(user?.card_radius)
    ? Math.min(32, Math.max(10, user.card_radius))
    : defaultTheme.cardRadius;
  const pfpRadius = Number.isFinite(user?.pfp_radius)
    ? Math.min(50, Math.max(0, user.pfp_radius))
    : defaultTheme.pfpRadius;

  const root = document.documentElement;
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-2', shadeColor(accent, 12));
  root.style.setProperty('--surface', hexToRgba(surface, glassOpacity));
  root.style.setProperty('--surface-strong', hexToRgba(surface, Math.min(glassOpacity + 0.2, 0.95)));
  root.style.setProperty('--bg-start', background);
  root.style.setProperty('--bg-end', shadeColor(background, -12));
  root.style.setProperty('--card-radius', `${cardRadius}px`);
  root.style.setProperty('--pfp-radius', `${pfpRadius}%`);
};

const applyProfileBackground = () => {
  const card = $('#profileCard');
  if (!card) return;
  if (state.user?.profile_bg_url) {
    card.style.backgroundImage = `linear-gradient(180deg, rgba(10, 12, 16, 0.2), rgba(10, 12, 16, 0.6)), url('${state.user.profile_bg_url}')`;
    card.classList.add('has-bg');
  } else {
    card.style.backgroundImage = '';
    card.classList.remove('has-bg');
  }
};

const getKey = (obj, path) =>
  path.split('.').reduce((acc, key) => (acc && acc[key] ? acc[key] : null), obj);

const syncRecordLabel = () => {
  const btn = $('#recordBtn');
  if (!btn) return;
  const dict = window.I18N[state.lang] || window.I18N.en;
  btn.textContent = state.recording ? dict.messages.stop : dict.messages.record;
};

const applyTranslations = () => {
  const dict = window.I18N[state.lang] || window.I18N.en;
  document.documentElement.lang = state.lang;
  const direction = state.lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', direction);
  document.body.setAttribute('dir', direction);

  $$('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    const text = getKey(dict, key);
    if (text) el.textContent = text;
  });

  $$('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    const text = getKey(dict, key);
    if (text) el.setAttribute('placeholder', text);
  });

  syncRecordLabel();
  renderFeed();
  renderProducts();
  renderConversations();
  renderUsersSelect();
  renderGroupUserList();
  renderAdminUsers();
};

const setLang = (lang, persist = true) => {
  state.lang = lang;
  if (persist) localStorage.setItem('lang', lang);
  applyTranslations();
};

const openLightbox = (mediaUrl, mediaType) => {
  const lightbox = $('#lightbox');
  const body = $('#lightboxBody');
  if (!lightbox || !body) return;
  body.innerHTML = '';
  if (mediaType && mediaType.startsWith('video/')) {
    const video = document.createElement('video');
    video.src = mediaUrl;
    video.controls = true;
    video.autoplay = true;
    body.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = mediaUrl;
    img.alt = 'media';
    body.appendChild(img);
  }
  lightbox.classList.remove('hidden');
};

const closeLightbox = () => {
  const lightbox = $('#lightbox');
  const body = $('#lightboxBody');
  if (!lightbox || !body) return;
  body.innerHTML = '';
  lightbox.classList.add('hidden');
};

const openShareModal = (post) => {
  state.sharePost = post;
  state.shareTargetId = null;
  const modal = $('#shareModal');
  const shareText = $('#shareText');
  if (shareText) shareText.value = '';
  renderShareConversations();
  modal?.classList.remove('hidden');
};

const closeShareModal = () => {
  state.sharePost = null;
  state.shareTargetId = null;
  $('#shareModal')?.classList.add('hidden');
};

const showSection = (sectionId) => {
  $$('.section').forEach((section) => section.classList.remove('active'));
  $(`#${sectionId}`).classList.add('active');
  $$('.nav-link').forEach((btn) => {
    if (btn.dataset.section === sectionId) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  state.activeSection = sectionId;
  if (sectionId === 'messages') {
    loadConversations();
    refreshMessages();
  }
};

const showAuth = () => {
  $('#authModal').classList.remove('hidden');
  document.querySelector('.app-shell')?.classList.add('hidden');
  document.querySelector('.bottom-nav')?.classList.add('hidden');
};

const showApp = () => {
  $('#authModal').classList.add('hidden');
  document.querySelector('.app-shell')?.classList.remove('hidden');
  document.querySelector('.bottom-nav')?.classList.remove('hidden');
};

const apiFetch = async (url, options = {}) => {
  const _token = getToken();
  if (_token) {
    options.headers = options.headers || {};
    options.headers['x-auth-token'] = _token;
  }
  
  const res = await fetch(url, options);
  
  if (res.status === 401) {
    state.user = null;
    showAuth();
  }
  
  const data = await res.json().catch(() => ({}));
  
  if (res.status === 403 && data.error === 'Banned') {
    state.user = null;
    showAuth();
    toast(window.I18N[state.lang].labels.banned);
  }
  
  if (data && data.token) setToken(data.token);
  
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  
  return data;
};
const refreshStats = () => {
  const memeCount = state.products.length;
  const postCount = state.posts.length;
  const friendCount = state.users.length;
  $('#statMemes').textContent = String(memeCount);
  $('#statPosts').textContent = String(postCount);
  $('#statFriends').textContent = String(friendCount);

  const myPosts = state.user ? state.posts.filter((p) => p.user_id === state.user.id).length : 0;
  const myProducts = state.user?.is_owner ? memeCount : 0;
  const profileProducts = $('#profileStatProducts');
  if (profileProducts) profileProducts.textContent = String(myProducts);
  const profilePosts = $('#profileStatPosts');
  if (profilePosts) profilePosts.textContent = String(myPosts);
  const profileFriends = $('#profileStatFriends');
  if (profileFriends) profileFriends.textContent = String(friendCount);
};

const renderHomeNews = () => {
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

const renderProducts = () => {
  const grid = $('#productsGrid');
  grid.innerHTML = '';
  state.products.forEach((product) => {
    const card = document.createElement('div');
    card.className = 'card';
    if (product.image_url) {
      const img = document.createElement('img');
      img.src = product.image_url;
      img.alt = product.title;
      card.appendChild(img);
    }
    const title = document.createElement('h4');
    title.textContent = product.title;
    card.appendChild(title);
    if (product.description) {
      const p = document.createElement('p');
      p.textContent = product.description;
      card.appendChild(p);
    }
    if (product.price) {
      const price = document.createElement('div');
      price.className = 'chip';
      price.textContent = product.price;
      card.appendChild(price);
    }
    if (product.link) {
      const link = document.createElement('a');
      link.href = product.link;
      link.target = '_blank';
      link.className = 'chip link';
      link.textContent = window.I18N[state.lang].labels.open;
      card.appendChild(link);
    }
    if (state.user?.is_owner) {
      const del = document.createElement('button');
      del.className = 'danger';
      del.textContent = window.I18N[state.lang].labels.delete;
      del.addEventListener('click', async () => {
        await apiFetch(`/api/products/${product.id}`, { method: 'DELETE' });
        await loadProducts();
      });
      card.appendChild(del);
    }
    grid.appendChild(card);
  });
};

const renderFeed = () => {
  const list = $('#feedList');
  list.innerHTML = '';
  state.posts.forEach((post) => {
    const card = document.createElement('div');
    card.className = 'panel feed-item';
    card.dataset.postId = String(post.id);

    const meta = document.createElement('div');
    meta.className = 'feed-meta';
    const userWrap = document.createElement('div');
    userWrap.className = 'feed-user';
    const avatar = document.createElement('img');
    avatar.className = 'avatar';
    avatar.src = post.avatar_url || '';
    avatar.alt = post.display_name;
    userWrap.appendChild(avatar);

    const name = document.createElement('span');
    name.textContent = post.display_name;
    if (post.is_owner || post.is_admin) name.classList.add('admin-name');
    userWrap.appendChild(name);
    meta.appendChild(userWrap);

    const time = document.createElement('span');
    time.className = 'feed-time';
    time.textContent = new Date(post.created_at).toLocaleString();
    meta.appendChild(time);

    card.appendChild(meta);

    if (post.media_url) {
      if (post.media_type && post.media_type.startsWith('video/')) {
        const mediaWrap = document.createElement('div');
        mediaWrap.className = 'feed-media';
        mediaWrap.classList.add('no-zoom');
        const video = document.createElement('video');
        video.src = post.media_url;
        video.controls = true;
        mediaWrap.appendChild(video);
        card.appendChild(mediaWrap);
      } else if (post.media_type && post.media_type.startsWith('image/')) {
        const mediaWrap = document.createElement('div');
        mediaWrap.className = 'feed-media';
        const img = document.createElement('img');
        img.src = post.media_url;
        img.alt = 'media';
        mediaWrap.appendChild(img);
        mediaWrap.addEventListener('click', () => openLightbox(post.media_url, post.media_type));
        card.appendChild(mediaWrap);
      } else if (post.media_type && post.media_type.startsWith('audio/')) {
        const audio = document.createElement('audio');
        audio.className = 'feed-audio';
        audio.src = post.media_url;
        audio.controls = true;
        card.appendChild(audio);
      } else {
        const link = document.createElement('a');
        link.href = post.media_url;
        link.textContent = window.I18N[state.lang].labels.download;
        link.target = '_blank';
        card.appendChild(link);
      }
    }

    if (post.content) {
      const p = document.createElement('p');
      p.textContent = post.content;
      card.appendChild(p);
    }

    const actions = document.createElement('div');
    actions.className = 'feed-actions';

    const likeBtn = document.createElement('button');
    likeBtn.className = 'feed-action';
    if (post.liked_by_me) likeBtn.classList.add('active');
    likeBtn.innerHTML = `<span class="material-symbols-rounded">favorite</span><span>${
      window.I18N[state.lang].feed.like
    } (${post.likes_count || 0})</span>`;
    likeBtn.addEventListener('click', async () => {
      try {
        const result = await apiFetch(`/api/posts/${post.id}/like`, { method: 'POST' });
        post.likes_count = result.likes_count;
        post.liked_by_me = result.liked_by_me;
        renderFeed();
      } catch (err) {
        toast(err.message);
      }
    });
    actions.appendChild(likeBtn);

    const commentBtn = document.createElement('button');
    commentBtn.className = 'feed-action';
    commentBtn.innerHTML = `<span class="material-symbols-rounded">chat_bubble</span><span>${
      window.I18N[state.lang].feed.comment
    } (${(post.comments || []).length})</span>`;
    actions.appendChild(commentBtn);

    const shareBtn = document.createElement('button');
    shareBtn.className = 'feed-action';
    shareBtn.innerHTML = `<span class="material-symbols-rounded">ios_share</span><span>${
      window.I18N[state.lang].feed.share
    }</span>`;
    shareBtn.addEventListener('click', async () => {
      openShareModal(post);
    });
    actions.appendChild(shareBtn);

    card.appendChild(actions);

    const commentList = document.createElement('div');
    commentList.className = 'comment-list';
    (post.comments || []).forEach((comment) => {
      const row = document.createElement('div');
      row.className = 'comment-item';
      const cAvatar = document.createElement('img');
      cAvatar.className = 'avatar';
      cAvatar.src = comment.avatar_url || '';
      cAvatar.alt = comment.display_name;
      row.appendChild(cAvatar);
      const text = document.createElement('div');
      const author = document.createElement('strong');
      author.textContent = comment.display_name;
      if (comment.is_owner || comment.is_admin) author.classList.add('admin-name');
      text.appendChild(author);
      const message = document.createElement('span');
      message.textContent = ` ${comment.text}`;
      text.appendChild(message);
      row.appendChild(text);
      commentList.appendChild(row);
    });
    card.appendChild(commentList);

    const commentForm = document.createElement('form');
    commentForm.className = 'comment-form';
    const commentInput = document.createElement('input');
    commentInput.type = 'text';
    commentInput.placeholder = window.I18N[state.lang].feed.commentPlaceholder;
    const commentSubmit = document.createElement('button');
    commentSubmit.type = 'submit';
    commentSubmit.className = 'ghost';
    commentSubmit.textContent = window.I18N[state.lang].feed.comment;
    commentForm.appendChild(commentInput);
    commentForm.appendChild(commentSubmit);
    commentBtn.addEventListener('click', () => commentInput.focus());
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!commentInput.value.trim()) return;
      await apiFetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentInput.value })
      });
      await loadPosts();
    });
    card.appendChild(commentForm);

    if (state.user?.is_owner || post.user_id === state.user?.id) {
      const del = document.createElement('button');
      del.className = 'danger';
      del.textContent = window.I18N[state.lang].labels.delete;
      del.addEventListener('click', async () => {
        await apiFetch(`/api/posts/${post.id}`, { method: 'DELETE' });
        await loadPosts();
      });
      card.appendChild(del);
    }

    list.appendChild(card);
  });
};

const renderUsersSelect = () => {
  const select = $('#userSelect');
  if (!select) return;
  const query = ($('#userSearch')?.value || '').toLowerCase();
  select.innerHTML = '';
  state.users
    .filter((u) => u.id !== state.user?.id)
    .filter((u) => {
      if (!query) return true;
      return (
        u.display_name?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query)
      );
    })
    .forEach((u) => {
      const opt = document.createElement('option');
      opt.value = String(u.id);
      const role = u.is_owner
        ? ` (${window.I18N[state.lang].labels.owner})`
        : u.is_admin
          ? ` (${window.I18N[state.lang].labels.admin})`
          : '';
      opt.textContent = `${u.display_name}${role}`;
      select.appendChild(opt);
    });
};

const renderGroupUserList = () => {
  const list = $('#groupUserList');
  if (!list) return;
  const selected = new Set(
    Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map((el) => Number(el.value))
  );
  const query = ($('#groupSearch')?.value || '').toLowerCase();
  list.innerHTML = '';

  state.users
    .filter((u) => u.id !== state.user?.id)
    .filter((u) => {
      if (!query) return true;
      return (
        u.display_name?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query)
      );
    })
    .forEach((u) => {
      const row = document.createElement('label');
      row.className = 'group-user';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = String(u.id);
      checkbox.checked = selected.has(u.id);
      row.appendChild(checkbox);

      const avatar = document.createElement('img');
      avatar.className = 'avatar';
      avatar.src = u.avatar_url || '';
      avatar.alt = u.display_name;
      row.appendChild(avatar);

      const name = document.createElement('span');
      name.textContent = u.display_name;
      if (u.is_owner || u.is_admin) name.classList.add('admin-name');
      row.appendChild(name);

      list.appendChild(row);
    });
};

const renderShareConversations = () => {
  const list = $('#shareList');
  if (!list) return;
  list.innerHTML = '';
  if (!state.conversations.length) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = window.I18N[state.lang].messages.noChat;
    list.appendChild(empty);
    return;
  }

  state.conversations.forEach((c) => {
    const row = document.createElement('div');
    row.className = 'share-item';
    if (state.shareTargetId === c.id) row.classList.add('active');

    if (c.is_group && !c.member_avatars?.[0]) {
      const icon = document.createElement('div');
      icon.className = 'group-icon';
      icon.innerHTML = '<span class="material-symbols-rounded">groups</span>';
      row.appendChild(icon);
    } else {
      const avatar = document.createElement('img');
      avatar.className = 'avatar';
      avatar.src = c.is_group ? c.member_avatars?.[0] || '' : c.avatar_url || '';
      avatar.alt = c.display_name;
      row.appendChild(avatar);
    }

    const info = document.createElement('div');
    const title = document.createElement('div');
    title.textContent = c.display_name;
    info.appendChild(title);
    if (c.is_group) {
      const meta = document.createElement('div');
      meta.className = 'muted';
      meta.textContent = `${c.member_count || 0} ${window.I18N[state.lang].messages.members}`;
      info.appendChild(meta);
    }
    row.appendChild(info);

    row.addEventListener('click', () => {
      state.shareTargetId = c.id;
      renderShareConversations();
    });
    list.appendChild(row);
  });
};

const renderConversations = () => {
  const list = $('#convoList');
  list.innerHTML = '';
  state.conversations.forEach((c) => {
    const item = document.createElement('div');
    item.className = 'convo-item';
    if (c.id === state.activeConvoId) item.classList.add('active');

    const head = document.createElement('div');
    head.className = 'convo-head';

    const avatars = document.createElement('div');
    avatars.className = 'convo-avatars';
    if (c.is_group) {
      const avatarList = Array.isArray(c.member_avatars)
        ? c.member_avatars.filter(Boolean)
        : [];
      if (avatarList.length > 0) {
        avatarList.forEach((url) => {
          const img = document.createElement('img');
          img.src = url || '';
          img.alt = c.display_name;
          avatars.appendChild(img);
        });
      } else {
        const icon = document.createElement('div');
        icon.className = 'group-icon';
        icon.innerHTML = '<span class="material-symbols-rounded">groups</span>';
        avatars.appendChild(icon);
      }
    } else {
      const avatar = document.createElement('img');
      avatar.src = c.avatar_url || '';
      avatar.alt = c.display_name;
      avatars.appendChild(avatar);
    }
    head.appendChild(avatars);

    const meta = document.createElement('div');
    meta.className = 'convo-meta';
    const title = document.createElement('div');
    title.className = 'convo-title';
    title.textContent = c.display_name;
    if (!c.is_group && (c.is_owner || c.is_admin)) title.classList.add('admin-name');
    meta.appendChild(title);
    if (c.is_group) {
      const sub = document.createElement('div');
      sub.className = 'convo-sub';
      sub.textContent = `${c.member_count || 0} ${window.I18N[state.lang].messages.members}`;
      meta.appendChild(sub);
    }
    head.appendChild(meta);
    item.appendChild(head);

    const preview = document.createElement('div');
    preview.className = 'convo-sub';
    const previewText = c.last_body
      ? c.is_group && c.last_sender_name
        ? `${c.last_sender_name}: ${c.last_body}`
        : c.last_body
      : c.last_media_url
        ? window.I18N[state.lang].labels.media
        : '';
    preview.textContent = previewText ? previewText.slice(0, 50) : '';
    item.appendChild(preview);

    if (c.unread_count > 0) {
      const badge = document.createElement('div');
      badge.textContent = `${c.unread_count}`;
      badge.style.color = '#0b0d14';
      badge.style.background = 'var(--accent)';
      badge.style.borderRadius = '999px';
      badge.style.display = 'inline-block';
      badge.style.padding = '2px 8px';
      badge.style.marginTop = '6px';
      item.appendChild(badge);
    } else if (c.seen) {
      const seen = document.createElement('div');
      seen.textContent = window.I18N[state.lang].labels.seen;
      seen.style.fontSize = '11px';
      seen.style.color = 'var(--muted)';
      item.appendChild(seen);
    }

    item.addEventListener('click', () => openConversation(c));
    list.appendChild(item);
  });
};

const renderMessages = (messages, otherLastSeenAt) => {
  const list = $('#messageList');
  list.innerHTML = '';
  messages.forEach((m) => {
    const card = document.createElement('div');
    card.className = 'message';
    const isMe = m.sender_id === state.user?.id;

    const row = document.createElement('div');
    row.className = 'message-row';
    if (isMe) row.classList.add('me');

    const avatar = document.createElement('img');
    avatar.className = 'message-avatar';
    avatar.src = m.avatar_url || '';
    avatar.alt = m.display_name;

    const content = document.createElement('div');
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    if (m.body) {
      const p = document.createElement('p');
      p.textContent = m.body;
      bubble.appendChild(p);
    }

    if (m.media_url) {
      if (m.media_type && m.media_type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = m.media_url;
        video.controls = true;
        bubble.appendChild(video);
      } else if (m.media_type && m.media_type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = m.media_url;
        img.alt = 'media';
        bubble.appendChild(img);
      } else if (m.media_type && m.media_type.startsWith('audio/')) {
        const audio = document.createElement('audio');
        audio.src = m.media_url;
        audio.controls = true;
        bubble.appendChild(audio);
      } else {
        const link = document.createElement('a');
        link.href = m.media_url;
        link.target = '_blank';
        link.textContent = window.I18N[state.lang].labels.download;
        bubble.appendChild(link);
      }
    }

    const meta = document.createElement('div');
    meta.className = 'message-meta';
    const nameSpan = document.createElement('span');
    nameSpan.textContent = m.display_name;
    if (m.is_owner || m.is_admin) nameSpan.classList.add('admin-name');
    meta.appendChild(nameSpan);
    const time = new Date(m.created_at).toLocaleString();
    const seen =
      m.sender_id === state.user?.id &&
      otherLastSeenAt &&
      m.created_at <= otherLastSeenAt;
    const timeSpan = document.createElement('span');
    timeSpan.textContent = ` · ${time}${seen ? ' · ' + window.I18N[state.lang].labels.seen : ''}`;
    meta.appendChild(timeSpan);

    content.appendChild(bubble);
    content.appendChild(meta);

    if (isMe) {
      row.appendChild(content);
      row.appendChild(avatar);
    } else {
      row.appendChild(avatar);
      row.appendChild(content);
    }

    card.appendChild(row);
    list.appendChild(card);
  });
  list.scrollTop = list.scrollHeight;
};

const updateProfileHeader = () => {
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
};

const bindFileInput = (id) => {
  const input = document.getElementById(id);
  const label = document.querySelector(`[data-file-name=\"${id}\"]`);
  if (!input || !label) return;
  input.addEventListener('change', () => {
    label.textContent = input.files && input.files[0] ? input.files[0].name : '';
  });
};

const clearFileName = (id) => {
  const label = document.querySelector(`[data-file-name=\"${id}\"]`);
  if (label) label.textContent = '';
};

const setupFileInputs = () => {
  ['productImage', 'postMedia', 'messageMedia', 'avatarFile', 'profileBgFile'].forEach(bindFileInput);
};

const setupVoiceRecorder = () => {
  const recordBtn = $('#recordBtn');
  const voicePreview = $('#voicePreview');
  if (!recordBtn) return;

  let recorder = null;
  let chunks = [];
  syncRecordLabel();

  recordBtn.addEventListener('click', async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast('Microphone is not supported in this browser.');
      return;
    }
    if (state.recording) {
      state.recording = false;
      recorder?.stop();
      syncRecordLabel();
      return;
    }

    try {
      state.voiceBlob = null;
      if (voicePreview) {
        voicePreview.pause();
        voicePreview.classList.add('hidden');
        voicePreview.removeAttribute('src');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder = new MediaRecorder(stream);
      chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        state.voiceBlob = blob;
        if (voicePreview) {
          voicePreview.src = URL.createObjectURL(blob);
          voicePreview.classList.remove('hidden');
        }
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      state.recording = true;
      syncRecordLabel();
    } catch (err) {
      toast('Microphone permission denied.');
    }
  });
};

const loadSettings = async () => {
  const { settings } = await apiFetch('/api/settings');
  state.settings = settings;
  $('#heroTitle').textContent = settings.hero_title || '';
  $('#heroSubtitle').textContent = settings.hero_subtitle || '';
  $('#aboutText').textContent = settings.about_text || '';
  if (state.user?.is_owner) {
    $('#settingsForm [name="hero_title"]').value = settings.hero_title || '';
    $('#settingsForm [name="hero_subtitle"]').value = settings.hero_subtitle || '';
    $('#settingsForm [name="about_text"]').value = settings.about_text || '';
  }
};

const loadUsers = async () => {
  const { users } = await apiFetch('/api/users');
  state.users = users;
  renderUsersSelect();
  renderGroupUserList();
  refreshStats();
};

const renderAdminUsers = () => {
  const container = $('#adminUsers');
  if (!container) return;
  container.innerHTML = '';
  const isOwner = Boolean(state.user?.is_owner);
  const dict = window.I18N[state.lang] || window.I18N.en;

  state.adminUsers.forEach((user) => {
    const row = document.createElement('div');
    row.className = 'admin-user';

    const info = document.createElement('div');
    const name = document.createElement('div');
    name.textContent = `${user.display_name} (${user.email})`;
    if (user.is_owner || user.is_admin) name.classList.add('admin-name');
    info.appendChild(name);

    const meta = document.createElement('div');
    const role = user.is_owner ? dict.labels.owner : user.is_admin ? dict.labels.admin : '';
    let ban = '';
    if (user.banned_until) {
      if (user.banned_until === 'forever') {
        ban = ` · ${dict.labels.banned}`;
      } else {
        const until = new Date(user.banned_until).toLocaleDateString();
        ban = ` · ${dict.labels.banned} (${until})`;
      }
    }
    meta.textContent = `${role}${ban}`;
    meta.className = 'muted';
    info.appendChild(meta);

    row.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'admin-user-actions';

    if (!user.is_owner) {
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'ghost';
      toggleBtn.textContent = user.is_admin ? dict.admin.removeAdmin : dict.admin.makeAdmin;
      toggleBtn.addEventListener('click', async () => {
        await apiFetch(`/api/admin/users/${user.id}/admin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_admin: !user.is_admin })
        });
        await loadAdminUsers();
        await loadUsers();
      });
      actions.appendChild(toggleBtn);

      const banSelect = document.createElement('select');
      ['1', '7', '30', '90', '365', 'forever'].forEach((value) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent =
          value === 'forever' ? dict.admin.durationForever : `${value}${dict.admin.durationDays}`;
        banSelect.appendChild(opt);
      });
      actions.appendChild(banSelect);

      const banBtn = document.createElement('button');
      banBtn.className = 'danger';
      banBtn.textContent = dict.admin.ban;
      banBtn.addEventListener('click', async () => {
        await apiFetch(`/api/admin/users/${user.id}/ban`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duration: banSelect.value })
        });
        await loadAdminUsers();
      });
      actions.appendChild(banBtn);

      if (user.banned_until) {
        const unbanBtn = document.createElement('button');
        unbanBtn.className = 'ghost';
        unbanBtn.textContent = dict.admin.unban;
        unbanBtn.addEventListener('click', async () => {
          await apiFetch(`/api/admin/users/${user.id}/unban`, { method: 'POST' });
          await loadAdminUsers();
        });
        actions.appendChild(unbanBtn);
      }

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'danger';
      deleteBtn.textContent = dict.admin.deleteUser;
      deleteBtn.addEventListener('click', async () => {
        if (!confirm(dict.admin.deleteConfirm)) return;
        await apiFetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
        await loadAdminUsers();
        await loadUsers();
        await loadConversations();
      });
      actions.appendChild(deleteBtn);
    } else if (isOwner) {
      const ownerTag = document.createElement('span');
      ownerTag.textContent = dict.labels.owner;
      ownerTag.className = 'muted';
      actions.appendChild(ownerTag);
    }

    row.appendChild(actions);
    container.appendChild(row);
  });
};

const loadAdminUsers = async () => {
  if (!state.user || !(state.user.is_owner || state.user.is_admin)) return;
  const { users } = await apiFetch('/api/admin/users');
  state.adminUsers = users;
  renderAdminUsers();
};

const loadProducts = async () => {
  const { products } = await apiFetch('/api/products');
  state.products = products;
  renderProducts();
  refreshStats();
};

const loadPosts = async () => {
  const { posts } = await apiFetch('/api/posts');
  state.posts = posts;
  renderFeed();
  renderHomeNews();
  refreshStats();
  if (state.pendingPostId) {
    const card = document.querySelector(`[data-post-id="${state.pendingPostId}"]`);
    if (card) {
      showSection('feed');
      card.classList.add('highlight');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => card.classList.remove('highlight'), 2000);
    }
    state.pendingPostId = null;
  }
};

const loadConversations = async () => {
  const { conversations } = await apiFetch('/api/conversations');
  state.conversations = conversations;
  state.activeConversation = state.conversations.find((c) => c.id === state.activeConvoId) || null;
  if (!state.activeConversation) {
    state.activeConvoId = null;
    const header = $('#convoHeader');
    if (header) header.textContent = window.I18N[state.lang].messages.noChat;
    $('#messageForm')?.classList.add('hidden');
  }
  renderConversations();
  renderShareConversations();
};

const openConversation = async (convo) => {
  if (!convo) return;
  // mobile: show chat, hide list
  const layout = document.querySelector('.messages-layout');
  if (layout && window.innerWidth < 768) {
    layout.classList.add('chat-open');
  }
  state.activeConvoId = convo.id;
  state.activeConversation = convo;
  $('#convoHeader').textContent = convo.display_name;
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
  }
  const chatAvatar = $('#chatAvatar');
  if (chatAvatar) {
    if (convo.is_group) {
      chatAvatar.classList.add('hidden');
      chatAvatar.removeAttribute('src');
    } else {
      chatAvatar.src = convo.avatar_url || '';
      chatAvatar.classList.remove('hidden');
    }
  }
  const status = $('#convoStatus');
  if (status) {
    status.textContent = convo.is_group
      ? `${convo.member_count || 0} ${window.I18N[state.lang].messages.members}`
      : '';
  }
  $('#messageForm').classList.remove('hidden');
  await refreshMessages();
  await apiFetch(`/api/conversations/${convo.id}/seen`, { method: 'POST' });
  await loadConversations();
};

const refreshMessages = async () => {
  if (!state.activeConvoId) return;
  const { messages, otherLastSeenAt, memberCount } = await apiFetch(
    `/api/conversations/${state.activeConvoId}/messages`
  );
  renderMessages(messages, otherLastSeenAt);
  const status = $('#convoStatus');
  if (status) {
    if (state.activeConversation?.is_group) {
      const count = memberCount || state.activeConversation.member_count || 0;
      status.textContent = `${count} ${window.I18N[state.lang].messages.members}`;
    } else {
      status.textContent = otherLastSeenAt
        ? `${window.I18N[state.lang].labels.seen}: ${new Date(otherLastSeenAt).toLocaleString()}`
        : '';
    }
  }
};

const refreshAll = async () => {
  await Promise.all([loadSettings(), loadUsers(), loadProducts(), loadPosts(), loadConversations()]);
  await loadAdminUsers();
};

const setupAuth = () => {
  const tabs = $$('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      $('#loginForm').classList.toggle('hidden', target !== 'login');
      $('#signupForm').classList.toggle('hidden', target !== 'signup');
    });
  });

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      email: form.email.value,
      password: form.password.value,
      remember: form.remember.checked
    };
    try {
      const { user } = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      state.user = user;
      localStorage.setItem('savedEmail', user.email || payload.email);
      await onLogin();
    } catch (err) {
      toast(err.message);
    }
  });

  $('#signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      displayName: form.displayName.value,
      email: form.email.value,
      password: form.password.value,
      remember: form.remember.checked
    };
    try {
      const { user } = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      state.user = user;
      localStorage.setItem('savedEmail', user.email || payload.email);
      await onLogin();
    } catch (err) {
      toast(err.message);
    }
  });
};

const setupNav = () => {
  $$('.nav-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.section) showSection(btn.dataset.section);
    });
  });

  $$('.hero-actions button').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.section) showSection(btn.dataset.section);
      if (btn.dataset.scroll) {
        const target = document.getElementById(btn.dataset.scroll);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  $('#logoutBtn').addEventListener('click', async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    clearToken();
    state.user = null;
    showAuth();
  });
  $('#logoutBtnMobile')?.addEventListener('click', async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    clearToken();
    state.user = null;
    showAuth();
  });
};

const setupForms = () => {
  const addProductToggle = $('#addProductToggle');
  if (addProductToggle) {
    addProductToggle.addEventListener('click', () => {
      const wrap = $('#productFormWrap');
      if (wrap) wrap.classList.toggle('hidden');
    });
  }

  $('#productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await apiFetch('/api/products', { method: 'POST', body: formData });
      e.target.reset();
      clearFileName('productImage');
      await loadProducts();
      await loadPosts();
      toast(window.I18N[state.lang].toast.saved);
    } catch (err) {
      toast(err.message);
    }
  });

  $('#postForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await apiFetch('/api/posts', { method: 'POST', body: formData });
      e.target.reset();
      clearFileName('postMedia');
      await loadPosts();
      toast(window.I18N[state.lang].toast.saved);
    } catch (err) {
      toast(err.message);
    }
  });

  $('#profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      displayName: form.displayName.value,
      bio: form.bio.value,
      language: state.lang
    };
    try {
      const { user } = await apiFetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      state.user = user;
      updateProfileHeader();
      toast(window.I18N[state.lang].toast.saved);
    } catch (err) {
      toast(err.message);
    }
  });

  $('#avatarForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const { user } = await apiFetch('/api/users/me/avatar', { method: 'POST', body: formData });
      state.user = user;
      updateProfileHeader();
      clearFileName('avatarFile');
      toast(window.I18N[state.lang].toast.saved);
    } catch (err) {
      toast(err.message);
    }
  });

  const bgForm = $('#profileBgForm');
  if (bgForm) {
    bgForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      try {
        const { user } = await apiFetch('/api/users/me/background', { method: 'POST', body: formData });
        state.user = user;
        applyProfileBackground();
        clearFileName('profileBgFile');
        toast(window.I18N[state.lang].toast.saved);
      } catch (err) {
        toast(err.message);
      }
    });
  }

  $('#settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      hero_title: form.hero_title.value,
      hero_subtitle: form.hero_subtitle.value,
      about_text: form.about_text.value
    };
    try {
      await apiFetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await loadSettings();
      toast(window.I18N[state.lang].toast.saved);
    } catch (err) {
      toast(err.message);
    }
  });

  const themeForm = $('#themeForm');
  if (themeForm) {
    themeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const payload = {
        themeAccent: form.themeAccent.value,
        themeSurface: form.themeSurface.value,
        themeBg: form.themeBackground.value,
        glassOpacity: Number(form.glassOpacity.value),
        cardRadius: Number(form.cardRadius.value),
        pfpRadius: Number(form.pfpRadius.value)
      };
      try {
        const { user } = await apiFetch('/api/users/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        state.user = user;
        applyTheme(user);
        updateProfileHeader();
        toast(window.I18N[state.lang].toast.saved);
      } catch (err) {
        toast(err.message);
      }
    });
  }

  $('#startChatBtn').addEventListener('click', async () => {
    const userId = $('#userSelect').value;
    if (!userId) return;
    try {
      const { conversationId } = await apiFetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      await loadConversations();
      const convo = state.conversations.find((c) => c.id === conversationId);
      if (convo) openConversation(convo);
    } catch (err) {
      toast(err.message);
    }
  });

  $('#createGroupBtn')?.addEventListener('click', async () => {
    const name = $('#groupName')?.value?.trim() || '';
    const checked = Array.from(
      document.querySelectorAll('#groupUserList input[type="checkbox"]:checked')
    ).map((el) => Number(el.value));
    if (checked.length < 2) {
      toast(window.I18N[state.lang].messages.groupMin);
      return;
    }
    try {
      const { conversationId } = await apiFetch('/api/conversations/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, userIds: checked })
      });
      await loadConversations();
      const convo = state.conversations.find((c) => c.id === conversationId);
      if (convo) openConversation(convo);
      const groupName = $('#groupName');
      if (groupName) groupName.value = '';
      renderGroupUserList();
    } catch (err) {
      toast(err.message);
    }
  });

  $('#messageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.activeConvoId) return;
    const formData = new FormData(e.target);
    if (state.voiceBlob) {
      formData.delete('media');
      const voiceFile = new File([state.voiceBlob], `voice-${Date.now()}.webm`, {
        type: state.voiceBlob.type || 'audio/webm'
      });
      formData.append('media', voiceFile);
      state.voiceBlob = null;
      const preview = $('#voicePreview');
      if (preview) {
        preview.pause();
        preview.classList.add('hidden');
        preview.removeAttribute('src');
      }
    }
    try {
      await apiFetch(`/api/conversations/${state.activeConvoId}/messages`, {
        method: 'POST',
        body: formData
      });
      e.target.reset();
      clearFileName('messageMedia');
      await refreshMessages();
      await loadConversations();
    } catch (err) {
      toast(err.message);
    }
  });
};

const setupLangToggles = () => {
  $('#langToggle').addEventListener('click', () => {
    setLang(state.lang === 'en' ? 'ar' : 'en');
  });
  $('#langToggleTop').addEventListener('click', () => {
    setLang(state.lang === 'en' ? 'ar' : 'en');
  });
  $('#langToggleMobile')?.addEventListener('click', () => {
    setLang(state.lang === 'en' ? 'ar' : 'en');
  });
};

const setupMessageSearch = () => {
  $('#userSearch')?.addEventListener('input', () => {
    renderUsersSelect();
  });
  $('#groupSearch')?.addEventListener('input', () => {
    renderGroupUserList();
  });
};

const setupModals = () => {
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.close;
      if (target === 'lightbox') closeLightbox();
      if (target === 'shareModal') closeShareModal();
    });
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
      closeShareModal();
    }
  });
  $('#shareSendBtn')?.addEventListener('click', async () => {
    if (!state.sharePost || !state.shareTargetId) {
      toast(window.I18N[state.lang].messages.noChat);
      return;
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}?post=${state.sharePost.id}`;
    const text = $('#shareText')?.value?.trim() || '';
    const body = [text, shareUrl].filter(Boolean).join(' ');
    try {
      const formData = new FormData();
      formData.append('text', body);
      await apiFetch(`/api/conversations/${state.shareTargetId}/messages`, {
        method: 'POST',
        body: formData
      });
      closeShareModal();
      toast(window.I18N[state.lang].toast.saved);
    } catch (err) {
      toast(err.message);
    }
  });
};

const onLogin = async () => {
  showApp();
  const isOwner = Boolean(state.user?.is_owner);
  const isAdmin = Boolean(state.user?.is_owner || state.user?.is_admin);
  $('#productFormWrap').classList.toggle('hidden', !isOwner);
  const prodToggleBtn = $('#addProductToggle');
  if (prodToggleBtn) prodToggleBtn.classList.toggle('hidden', !isOwner);
  $('#postFormWrap').classList.toggle('hidden', !isAdmin);
  $('#admin').classList.toggle('active', false);
  $('#admin').classList.toggle('hidden', !isAdmin);
  $$('.nav-link').find((b) => b.dataset.section === 'admin')?.classList.toggle('hidden', !isAdmin);
  $('#settingsPanel')?.classList.toggle('hidden', !state.user?.is_owner);

  if (state.user?.is_owner) {
    showSection('admin');
  } else {
    showSection('home');
  }

  $('#profileForm [name="displayName"]').value = state.user.display_name || '';
  $('#profileForm [name="bio"]').value = state.user.bio || '';
  applyTheme(state.user);
  updateProfileHeader();
  const chatAvatar = $('#chatAvatar');
  if (chatAvatar) {
    chatAvatar.classList.add('hidden');
    chatAvatar.removeAttribute('src');
  }

  const themeForm = $('#themeForm');
  if (themeForm) {
    themeForm.themeAccent.value = state.user.theme_accent || defaultTheme.accent;
    themeForm.themeSurface.value = state.user.theme_surface || defaultTheme.surface;
    themeForm.themeBackground.value = state.user.theme_bg || defaultTheme.background;
    themeForm.glassOpacity.value = String(
      Number.isFinite(state.user.glass_opacity) ? state.user.glass_opacity : defaultTheme.glassOpacity
    );
    themeForm.cardRadius.value = String(
      Number.isFinite(state.user.card_radius) ? state.user.card_radius : defaultTheme.cardRadius
    );
    themeForm.pfpRadius.value = String(
      Number.isFinite(state.user.pfp_radius) ? state.user.pfp_radius : defaultTheme.pfpRadius
    );
  }

  await refreshAll();

  clearInterval(state.refreshTimer);
  state.refreshTimer = setInterval(async () => {
    if (state.activeSection === 'messages') {
      await loadConversations();
      await refreshMessages();
    }
  }, 8000);
};

const bootstrap = async () => {
  applyTheme(null);
  const savedLang = localStorage.getItem('lang') || 'en';
  setLang(savedLang, false);

  const params = new URLSearchParams(window.location.search);
  const postParam = params.get('post');
  if (postParam) {
    state.pendingPostId = postParam;
  }

  const savedEmail = localStorage.getItem('savedEmail');
  if (savedEmail) {
    $('#loginForm [name="email"]').value = savedEmail;
  }

  setupAuth();
  setupNav();
  setupForms();
  setupFileInputs();
  setupVoiceRecorder();
  setupLangToggles();
  setupMessageSearch();
  setupModals();

  try {
    const _authTok = getToken();
    if (!_authTok) { showAuth(); return; }
    const { user } = await apiFetch('/api/auth/me');
    if (user) {
      state.user = user;
      await onLogin();
    } else {
      clearToken();
      showAuth();
    }
  } catch (err) {
    showAuth();
  }
};

bootstrap();
