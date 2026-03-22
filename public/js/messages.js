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
  if (avatar) {
    avatar.src = state.user.avatar_url || '';
  }
  const name = $('#profileName');
  if (name) name.textContent = state.user.display_name || '';
  const bio = $('#profileBio');
  if (bio) bio.textContent = state.user.bio || '';
  applyProfileBackground();
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
