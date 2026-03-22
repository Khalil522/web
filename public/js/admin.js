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
  state.activeConvoId = convo.id;
  state.activeConversation = convo;
  $('#convoHeader').textContent = convo.display_name;
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