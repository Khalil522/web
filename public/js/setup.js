
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
    state.user = null;
    showAuth();
  });
  $('#logoutBtnMobile')?.addEventListener('click', async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    state.user = null;
    showAuth();
  });
};

const setupForms = () => {
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
