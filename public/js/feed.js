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
