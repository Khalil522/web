const onLogin = async () => {
  showApp();
  const isOwner = Boolean(state.user?.is_owner);
  const isAdmin = Boolean(state.user?.is_owner || state.user?.is_admin);
  $('#productFormWrap').classList.toggle('hidden', !isOwner);
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
    const { user } = await apiFetch('/api/auth/me');
    if (user) {
      state.user = user;
      await onLogin();
    } else {
      showAuth();
    }
  } catch (err) {
    showAuth();
  }
};

bootstrap();
