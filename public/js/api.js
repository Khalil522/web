const getToken=()=>localStorage.getItem("auth_token");const setToken=(t)=>{if(t)localStorage.setItem("auth_token",t)};const clearToken=()=>localStorage.removeItem("auth_token");const apiFetch=async(url,options={})=>{const t=getToken();if(t){if(!options.headers)options.headers={};options.headers["x-auth-token"]=t;options.headers["Authorization"]="Bearer "+t;}const res=await fetch(url,options);if(res.status===401&&(url.includes("/api/auth/me")||url.includes("/api/auth/login"))){clearToken();state.user=null;showAuth();}const data=await res.json().catch(()=>({}));if(data&&data.token)setToken(data.token);if(res.status===403&&data.error==="Banned"){clearToken();state.user=null;showAuth();}if(!res.ok)throw new Error(data.error||"Request failed");return data;};const refreshStats=()=>{const mc=state.products.length,pc=state.posts.length,fc=state.users.length;if($("#statMemes"))$("#statMemes").textContent=String(mc);if($("#statPosts"))$("#statPosts").textContent=String(pc);if($("#statFriends"))$("#statFriends").textContent=String(fc);const mp=state.user?state.posts.filter(p=>p.user_id===state.user.id).length:0;const mprod=state.user?.is_owner?mc:0;if($("#profileStatProducts"))$("#profileStatProducts").textContent=String(mprod);if($("#profileStatPosts"))$("#profileStatPosts").textContent=String(mp);if($("#profileStatFriends"))$("#profileStatFriends").textContent=String(fc);};
const loadSettings = async () => {
  const { settings } = await apiFetch('/api/settings');
  state.settings = settings;
  if ($('#heroTitle')) $('#heroTitle').textContent = settings.hero_title || '';
  if ($('#heroSubtitle')) $('#heroSubtitle').textContent = settings.hero_subtitle || '';
  if ($('#aboutText')) $('#aboutText').textContent = settings.about_text || '';
};
const loadUsers = async () => {
  const { users } = await apiFetch('/api/users');
  state.users = users;
  if(typeof renderUsersSelect === 'function') renderUsersSelect();
  if(typeof renderUserSelectList === 'function') renderUserSelectList();
  if(typeof renderGroupUserList === 'function') renderGroupUserList();
  refreshStats();
};
const loadProducts = async () => {
  const { products } = await apiFetch('/api/products');
  state.products = products;
  if(typeof renderProducts === 'function') renderProducts();
  refreshStats();
};
const loadPosts = async () => {
  const { posts } = await apiFetch('/api/posts');
  state.posts = posts;
  if(typeof renderFeed === 'function') renderFeed();
  if(typeof renderHomeNews === 'function') renderHomeNews();
  refreshStats();
};
const loadConversations = async () => {
  const { conversations } = await apiFetch('/api/conversations');
  state.conversations = conversations;
  state.activeConversation = state.conversations.find(c => c.id === state.activeConvoId) || null;
  if (!state.activeConversation) {
    state.activeConvoId = null;
    if ($('#convoHeader')) $('#convoHeader').textContent = 'Select a chat';
    $('#messageForm')?.classList.add('hidden');
  }
  if(typeof renderConversations === 'function') renderConversations();
  if(typeof renderShareConversations === 'function') renderShareConversations();
};
const loadAdminUsers = async () => {
  if (!state.user || !(state.user.is_owner || state.user.is_admin)) return;
  const { users } = await apiFetch('/api/admin/users');
  state.adminUsers = users;
  if(typeof renderAdminUsers === 'function') renderAdminUsers();
};
const refreshAll = async () => {
  await Promise.all([loadSettings(), loadUsers(), loadProducts(), loadPosts(), loadConversations()]);
  await loadAdminUsers();
};
const refreshMessages = async () => {
  if (!state.activeConvoId) return;
  const { messages, otherLastSeenAt, memberCount } = await apiFetch('/api/conversations/' + state.activeConvoId + '/messages');
  if(typeof renderMessages === 'function') renderMessages(messages, otherLastSeenAt);
  const status = $('#convoStatus');
  if (status) {
    if (state.activeConversation?.is_group) {
      status.textContent = (memberCount || 0) + ' members';
    } else {
      status.textContent = otherLastSeenAt ? 'Seen: ' + new Date(otherLastSeenAt).toLocaleString() : '';
    }
  }
};