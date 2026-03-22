const apiFetch = async (url, options = {}) => {
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
