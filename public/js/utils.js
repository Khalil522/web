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
  if(typeof renderFeed==="function") renderFeed();
  if(typeof renderProducts==="function") renderProducts();
  if(typeof renderConversations==="function") renderConversations();
  if(typeof renderUsersSelect==="function") renderUsersSelect();
  if(typeof renderGroupUserList==="function") renderGroupUserList();
  if(typeof renderAdminUsers==="function") renderAdminUsers();
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
