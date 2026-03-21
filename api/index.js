require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { nanoid } = require('nanoid');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.set('trust proxy', 1);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const uploadAvatar = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => { if (!file.mimetype.startsWith('image/')) return cb(new Error('Images only')); cb(null, true); } });
const uploadBackground = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: (req, file, cb) => { if (!file.mimetype.startsWith('image/')) return cb(new Error('Images only')); cb(null, true); } });
const uploadMedia = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const uploadImage = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 }, fileFilter: (req, file, cb) => { if (!file.mimetype.startsWith('image/')) return cb(new Error('Images only')); cb(null, true); } });

const generateToken = () => crypto.randomBytes(32).toString('hex');
const now = () => new Date().toISOString();
const sanitizeText = (value, max) => { if (typeof value !== 'string') return ''; return value.trim().slice(0, max || 5000); };
const normalizeUser = (user) => ({ ...user, is_admin: Boolean(user.is_admin), is_owner: Boolean(user.is_owner), banned_until: user.banned_until || '', theme_accent: user.theme_accent || '#7dd3fc', theme_surface: user.theme_surface || '#14181f', theme_bg: user.theme_bg || '#0b0f14', glass_opacity: Number.isFinite(Number(user.glass_opacity)) ? Number(user.glass_opacity) : 0.16, card_radius: Number.isFinite(Number(user.card_radius)) ? Number(user.card_radius) : 18, pfp_radius: Number.isFinite(Number(user.pfp_radius)) ? Number(user.pfp_radius) : 50, profile_bg_url: user.profile_bg_url || '' });
const safeUser = (user) => { const n = normalizeUser(user); const { password_hash, ...safe } = n; return safe; };
const isBanned = (user) => { if (!user || !user.banned_until) return false; if (user.banned_until === 'forever') return true; return new Date(user.banned_until) > new Date(); };
const isAdminUser = (user) => Boolean(user && (user.is_owner || user.is_admin));

const uploadToStorage = async (buffer, filename, folder) => {
  const { error } = await supabase.storage.from('media').upload((folder || 'media') + '/' + filename, buffer, { upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('media').getPublicUrl((folder || 'media') + '/' + filename);
  return data.publicUrl;
};

const requireAuth = async (req, res, next) => {
  const token = req.headers['x-auth-token'] || (req.headers['authorization'] || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: session } = await supabase.from('auth_tokens').select('*, users(*)').eq('token', token).gt('expires_at', new Date().toISOString()).single();
  if (!session || !session.users) return res.status(401).json({ error: 'Unauthorized' });
  if (isBanned(session.users)) return res.status(403).json({ error: 'Banned' });
  req.user = safeUser(session.users);
  next();
};
const requireOwner = (req, res, next) => { if (!req.user || !req.user.is_owner) return res.status(403).json({ error: 'Owner only' }); next(); };
const requireAdmin = (req, res, next) => { if (!isAdminUser(req.user)) return res.status(403).json({ error: 'Admin only' }); next(); };

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/auth/me', async (req, res) => {
  const token = req.headers['x-auth-token'] || (req.headers['authorization'] || '').replace('Bearer ', '');
  if (!token) return res.json({ user: null });
  const { data: session } = await supabase.from('auth_tokens').select('*, users(*)').eq('token', token).gt('expires_at', new Date().toISOString()).single();
  if (!session || !session.users) return res.json({ user: null });
  if (isBanned(session.users)) { return res.status(403).json({ user: null, error: 'Banned' }); }
  res.json({ user: safeUser(session.users) });
});

app.post('/api/auth/register', async (req, res) => {
  const email = sanitizeText(req.body.email, 200).toLowerCase();
  const password = String(req.body.password || '');
  const displayName = sanitizeText(req.body.displayName, 80);
  const remember = Boolean(req.body.remember);
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (!displayName) return res.status(400).json({ error: 'Display name is required.' });
  const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();
  if (existing) return res.status(409).json({ error: 'Email already in use.' });
  const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
  const ownerEmail = (process.env.OWNER_EMAIL || '').toLowerCase().trim();
  const isOwner = ownerEmail ? email === ownerEmail : count === 0;
  const passwordHash = bcrypt.hashSync(password, 10);
  const { data: user, error } = await supabase.from('users').insert({ email, password_hash: passwordHash, display_name: displayName, is_owner: isOwner, is_admin: isOwner, created_at: now() }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  const token = generateToken();
  const expiresAt = new Date(Date.now() + (remember ? 30 : 1) * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from('auth_tokens').insert({ token, user_id: user.id, expires_at: expiresAt });
  res.json({ user: safeUser(user), token });
});

app.post('/api/auth/login', async (req, res) => {
  const email = sanitizeText(req.body.email, 200).toLowerCase();
  const password = String(req.body.password || '');
  const remember = Boolean(req.body.remember);
  const { data: user } = await supabase.from('users').select('*').eq('email', email).single();
  if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
  if (isBanned(user)) return res.status(403).json({ error: 'Banned' });
  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid email or password.' });
  const token = generateToken();
  const expiresAt = new Date(Date.now() + (remember ? 30 : 1) * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from('auth_tokens').insert({ token, user_id: user.id, expires_at: expiresAt });
  res.json({ user: safeUser(user), token });
});

app.post('/api/auth/logout', async (req, res) => {
  const token = req.headers['x-auth-token'];
  if (token) await supabase.from('auth_tokens').delete().eq('token', token);
  res.json({ ok: true });
});

app.get('/api/settings', async (req, res) => {
  const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
  res.json({ settings: data || {} });
});

app.patch('/api/settings', requireAuth, requireOwner, async (req, res) => {
  const update = {};
  for (const key of ['hero_title', 'hero_subtitle', 'about_text']) { if (key in req.body) update[key] = sanitizeText(req.body[key], 2000); }
  await supabase.from('settings').update(update).eq('id', 1);
  res.json({ ok: true });
});

app.get('/api/users', requireAuth, async (req, res) => {
  const { data: users } = await supabase.from('users').select('*').order('is_owner', { ascending: false });
  res.json({ users: (users || []).map(safeUser) });
});

app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  const { data: users } = await supabase.from('users').select('*').order('is_owner', { ascending: false });
  res.json({ users: (users || []).map(safeUser) });
});

app.patch('/api/users/me', requireAuth, async (req, res) => {
  const update = {};
  if (req.body.displayName) update.display_name = sanitizeText(req.body.displayName, 80);
  if (req.body.bio !== undefined) update.bio = sanitizeText(req.body.bio, 500);
  if (req.body.accentColor) update.accent_color = sanitizeText(req.body.accentColor, 20);
  if (req.body.language) update.language = sanitizeText(req.body.language, 5);
  if (req.body.themeAccent) update.theme_accent = sanitizeText(req.body.themeAccent, 20);
  if (req.body.themeSurface) update.theme_surface = sanitizeText(req.body.themeSurface, 20);
  if (req.body.themeBg) update.theme_bg = sanitizeText(req.body.themeBg, 20);
  const go = Number(req.body.glassOpacity); if (Number.isFinite(go)) update.glass_opacity = Math.min(0.3, Math.max(0.08, go));
  const cr = Number(req.body.cardRadius); if (Number.isFinite(cr)) update.card_radius = Math.min(32, Math.max(10, cr));
  const pr = Number(req.body.pfpRadius); if (Number.isFinite(pr)) update.pfp_radius = Math.min(50, Math.max(0, pr));
  const { data: user, error } = await supabase.from('users').update(update).eq('id', req.user.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ user: safeUser(user) });
});

app.post('/api/users/me/avatar', requireAuth, uploadAvatar.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const filename = 'avatar-' + Date.now() + '-' + nanoid(10) + path.extname(req.file.originalname);
  const url = await uploadToStorage(req.file.buffer, filename, 'avatars');
  const { data: user } = await supabase.from('users').update({ avatar_url: url }).eq('id', req.user.id).select().single();
  res.json({ user: safeUser(user) });
});

app.post('/api/users/me/background', requireAuth, uploadBackground.single('background'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const filename = 'bg-' + Date.now() + '-' + nanoid(10) + path.extname(req.file.originalname);
  const url = await uploadToStorage(req.file.buffer, filename, 'backgrounds');
  const { data: user } = await supabase.from('users').update({ profile_bg_url: url }).eq('id', req.user.id).select().single();
  res.json({ user: safeUser(user) });
});

app.post('/api/admin/users/:id/admin', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { data: target } = await supabase.from('users').select('*').eq('id', id).single();
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (target.is_owner) return res.status(403).json({ error: 'Cannot change owner role.' });
  await supabase.from('users').update({ is_admin: Boolean(req.body.is_admin) }).eq('id', id);
  res.json({ ok: true });
});

app.post('/api/admin/users/:id/ban', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const duration = String(req.body.duration || '');
  const { data: target } = await supabase.from('users').select('*').eq('id', id).single();
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (target.is_owner) return res.status(403).json({ error: 'Cannot ban the owner.' });
  if (id === req.user.id) return res.status(403).json({ error: 'Cannot ban yourself.' });
  let banned_until;
  if (duration === 'forever') { banned_until = 'forever'; } else { const days = Number(duration); if (!Number.isFinite(days) || days <= 0) return res.status(400).json({ error: 'Invalid duration.' }); banned_until = new Date(Date.now() + days * 86400000).toISOString(); }
  await supabase.from('users').update({ banned_until }).eq('id', id);
  res.json({ ok: true, banned_until });
});

app.post('/api/admin/users/:id/unban', requireAuth, requireAdmin, async (req, res) => {
  await supabase.from('users').update({ banned_until: '' }).eq('id', Number(req.params.id));
  res.json({ ok: true });
});

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { data: target } = await supabase.from('users').select('*').eq('id', id).single();
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (target.is_owner) return res.status(403).json({ error: 'Cannot delete the owner.' });
  if (id === req.user.id) return res.status(403).json({ error: 'Cannot delete yourself.' });
  await supabase.from('users').delete().eq('id', id);
  res.json({ ok: true });
});

app.get('/api/products', async (req, res) => {
  const { data: products } = await supabase.from('products').select('*').order('id', { ascending: false });
  res.json({ products: products || [] });
});

app.post('/api/products', requireAuth, requireOwner, uploadImage.single('image'), async (req, res) => {
  const title = sanitizeText(req.body.title, 120);
  if (!title) return res.status(400).json({ error: 'Title is required.' });
  let image_url = '';
  if (req.file) { const filename = 'product-' + Date.now() + '-' + nanoid(10) + path.extname(req.file.originalname); image_url = await uploadToStorage(req.file.buffer, filename, 'products'); }
  const { data: product } = await supabase.from('products').insert({ title, description: sanitizeText(req.body.description, 1000), price: sanitizeText(req.body.price, 40), link: sanitizeText(req.body.link, 300), image_url, created_at: now(), updated_at: now() }).select().single();
  res.json({ product });
});

app.patch('/api/products/:id', requireAuth, requireOwner, uploadImage.single('image'), async (req, res) => {
  const id = Number(req.params.id);
  const update = { updated_at: now() };
  if (req.body.title) update.title = sanitizeText(req.body.title, 120);
  if (req.body.description) update.description = sanitizeText(req.body.description, 1000);
  if (req.body.price) update.price = sanitizeText(req.body.price, 40);
  if (req.body.link) update.link = sanitizeText(req.body.link, 300);
  if (req.file) { const filename = 'product-' + Date.now() + '-' + nanoid(10) + path.extname(req.file.originalname); update.image_url = await uploadToStorage(req.file.buffer, filename, 'products'); }
  const { data: product } = await supabase.from('products').update(update).eq('id', id).select().single();
  res.json({ product });
});

app.delete('/api/products/:id', requireAuth, requireOwner, async (req, res) => {
  await supabase.from('products').delete().eq('id', Number(req.params.id));
  res.json({ ok: true });
});

app.get('/api/posts', requireAuth, async (req, res) => {
  const { data: posts } = await supabase.from('posts').select('*, users(id, display_name, avatar_url, accent_color, is_owner, is_admin)').order('id', { ascending: false }).limit(100);
  const postIds = (posts || []).map(function(p) { return p.id; });
  const { data: allComments } = postIds.length ? await supabase.from('comments').select('*, users(id, display_name, avatar_url, is_owner, is_admin)').in('post_id', postIds) : { data: [] };
  const commentsMap = {};
  (allComments || []).forEach(function(c) { if (!commentsMap[c.post_id]) commentsMap[c.post_id] = []; commentsMap[c.post_id].push({ id: c.id, user_id: c.user_id, text: c.text, created_at: c.created_at, display_name: (c.users && c.users.display_name) || 'Unknown', avatar_url: (c.users && c.users.avatar_url) || '', is_admin: (c.users && c.users.is_admin) || false, is_owner: (c.users && c.users.is_owner) || false }); });
  const result = (posts || []).map(function(post) { const likes = Array.isArray(post.likes) ? post.likes : []; return { id: post.id, user_id: post.user_id, content: post.content, media_url: post.media_url, media_type: post.media_type, created_at: post.created_at, display_name: (post.users && post.users.display_name) || 'Unknown', avatar_url: (post.users && post.users.avatar_url) || '', accent_color: (post.users && post.users.accent_color) || '#63d4ff', is_owner: (post.users && post.users.is_owner) || false, is_admin: (post.users && post.users.is_admin) || false, likes_count: likes.length, liked_by_me: likes.indexOf(req.user.id) >= 0, comments: commentsMap[post.id] || [], likes: likes }; });
  res.json({ posts: result });
});

app.post('/api/posts', requireAuth, requireAdmin, uploadMedia.single('media'), async (req, res) => {
  const content = sanitizeText(req.body.content, 2000);
  let media_url = '', media_type = '';
  if (req.file) { const filename = 'post-' + Date.now() + '-' + nanoid(10) + path.extname(req.file.originalname); media_url = await uploadToStorage(req.file.buffer, filename, 'posts'); media_type = req.file.mimetype; }
  const { data: post } = await supabase.from('posts').insert({ user_id: req.user.id, content, media_url, media_type, likes: [], created_at: now() }).select().single();
  const { data: user } = await supabase.from('users').select('*').eq('id', req.user.id).single();
  res.json({ post: { id: post.id, user_id: post.user_id, content: post.content, media_url: post.media_url, media_type: post.media_type, created_at: post.created_at, display_name: (user && user.display_name) || 'Unknown', avatar_url: (user && user.avatar_url) || '', accent_color: (user && user.accent_color) || '#63d4ff', is_owner: (user && user.is_owner) || false, likes_count: 0, liked_by_me: false, comments: [] } });
});

app.delete('/api/posts/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { data: post } = await supabase.from('posts').select('*').eq('id', id).single();
  if (!post) return res.status(404).json({ error: 'Not found' });
  if (post.user_id !== req.user.id && !req.user.is_owner) return res.status(403).json({ error: 'Not allowed' });
  await supabase.from('posts').delete().eq('id', id);
  res.json({ ok: true });
});

app.post('/api/posts/:id/like', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { data: post } = await supabase.from('posts').select('likes').eq('id', id).single();
  if (!post) return res.status(404).json({ error: 'Not found' });
  let likes = Array.isArray(post.likes) ? post.likes : [];
  const idx = likes.indexOf(req.user.id);
  if (idx >= 0) likes.splice(idx, 1); else likes.push(req.user.id);
  await supabase.from('posts').update({ likes }).eq('id', id);
  res.json({ likes_count: likes.length, liked_by_me: likes.indexOf(req.user.id) >= 0 });
});

app.post('/api/posts/:id/comments', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const text = sanitizeText(req.body.text, 500);
  if (!text) return res.status(400).json({ error: 'Comment is empty.' });
  const { data: comment } = await supabase.from('comments').insert({ post_id: id, user_id: req.user.id, text, created_at: now() }).select().single();
  const { data: author } = await supabase.from('users').select('*').eq('id', req.user.id).single();
  res.json({ comment: { id: comment.id, user_id: comment.user_id, text: comment.text, created_at: comment.created_at, display_name: (author && author.display_name) || 'Unknown', avatar_url: (author && author.avatar_url) || '', is_admin: (author && author.is_admin) || false, is_owner: (author && author.is_owner) || false } });
});

app.get('/api/conversations', requireAuth, async (req, res) => {
  const { data: memberships } = await supabase.from('conversation_members').select('*').eq('user_id', req.user.id);
  const convoIds = (memberships || []).map(function(m) { return m.conversation_id; });
  if (!convoIds.length) return res.json({ conversations: [] });
  const { data: conversations } = await supabase.from('conversations').select('*').in('id', convoIds);
  const { data: allMembers } = await supabase.from('conversation_members').select('*').in('conversation_id', convoIds);
  const memberUserIds = [];
  (allMembers || []).forEach(function(m) { if (memberUserIds.indexOf(m.user_id) < 0) memberUserIds.push(m.user_id); });
  const { data: memberUsers } = memberUserIds.length ? await supabase.from('users').select('id, display_name, avatar_url, accent_color, is_owner, is_admin').in('id', memberUserIds) : { data: [] };
  const usersMap = {};
  (memberUsers || []).forEach(function(u) { usersMap[u.id] = u; });
  const { data: allMessages } = await supabase.from('messages').select('*').in('conversation_id', convoIds).order('id', { ascending: true });
  const result = (conversations || []).map(function(convo) {
    const members = (allMembers || []).filter(function(m) { return m.conversation_id === convo.id; });
    const selfMember = members.find(function(m) { return m.user_id === req.user.id; });
    const otherMembers = members.filter(function(m) { return m.user_id !== req.user.id; });
    const otherUsers = otherMembers.map(function(m) { return usersMap[m.user_id]; }).filter(Boolean);
    const otherUser = otherUsers[0];
    const isGroup = Boolean(convo.is_group) || otherUsers.length > 1;
    const msgs = (allMessages || []).filter(function(m) { return m.conversation_id === convo.id; });
    const last = msgs[msgs.length - 1];
    const lastSender = last ? usersMap[last.sender_id] : null;
    const otherMember = otherMembers[0];
    const unread = msgs.filter(function(m) { if (m.sender_id === req.user.id) return false; if (!selfMember || !selfMember.last_seen_at) return true; return m.created_at > selfMember.last_seen_at; }).length;
    const seen = !isGroup && last && last.sender_id === req.user.id && otherMember && otherMember.last_seen_at && otherMember.last_seen_at >= last.created_at;
    const displayName = isGroup ? (convo.name || otherUsers.map(function(u) { return u.display_name; }).slice(0, 3).join(', ') || 'Group chat') : ((otherUser && otherUser.display_name) || 'Unknown');
    return { id: convo.id, is_group: isGroup, group_name: convo.name || '', member_count: members.length, member_avatars: otherUsers.map(function(u) { return u.avatar_url; }).filter(Boolean).slice(0, 3), member_names: otherUsers.map(function(u) { return u.display_name; }).filter(Boolean).slice(0, 3), other_id: isGroup ? 0 : ((otherUser && otherUser.id) || 0), display_name: displayName, avatar_url: isGroup ? '' : ((otherUser && otherUser.avatar_url) || ''), accent_color: isGroup ? '#63d4ff' : ((otherUser && otherUser.accent_color) || '#63d4ff'), is_admin: isGroup ? false : ((otherUser && otherUser.is_admin) || false), is_owner: isGroup ? false : ((otherUser && otherUser.is_owner) || false), other_last_seen_at: isGroup ? '' : ((otherMember && otherMember.last_seen_at) || ''), self_last_seen_at: (selfMember && selfMember.last_seen_at) || '', last_body: (last && last.body) || '', last_media_url: (last && last.media_url) || '', last_media_type: (last && last.media_type) || '', last_created_at: (last && last.created_at) || '', last_sender_id: (last && last.sender_id) || 0, last_sender_name: (lastSender && lastSender.display_name) || '', unread_count: unread, seen: Boolean(seen) };
  });
  result.sort(function(a, b) { if (!a.last_created_at && b.last_created_at) return 1; if (a.last_created_at && !b.last_created_at) return -1; if (!a.last_created_at && !b.last_created_at) return 0; return new Date(b.last_created_at) - new Date(a.last_created_at); });
  res.json({ conversations: result });
});

app.post('/api/conversations', requireAuth, async (req, res) => {
  const otherId = Number(req.body.userId);
  if (!otherId || otherId === req.user.id) return res.status(400).json({ error: 'Invalid user.' });
  const { data: otherUser } = await supabase.from('users').select('id').eq('id', otherId).single();
  if (!otherUser) return res.status(404).json({ error: 'User not found.' });
  const { data: myMemberships } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', req.user.id);
  const myIds = (myMemberships || []).map(function(m) { return m.conversation_id; });
  const { data: sharedMemberships } = myIds.length ? await supabase.from('conversation_members').select('conversation_id').eq('user_id', otherId).in('conversation_id', myIds) : { data: [] };
  for (let i = 0; i < (sharedMemberships || []).length; i++) { const m = sharedMemberships[i]; const { data: convo } = await supabase.from('conversations').select('*').eq('id', m.conversation_id).single(); if (convo && !convo.is_group) return res.json({ conversationId: convo.id }); }
  const { data: convo } = await supabase.from('conversations').insert({ is_group: false, name: '', created_by: req.user.id, created_at: now() }).select().single();
  await supabase.from('conversation_members').insert([{ conversation_id: convo.id, user_id: req.user.id }, { conversation_id: convo.id, user_id: otherId }]);
  res.json({ conversationId: convo.id });
});

app.post('/api/conversations/group', requireAuth, async (req, res) => {
  const name = sanitizeText(req.body.name, 80);
  const rawIds = Array.isArray(req.body.userIds) ? req.body.userIds : [];
  const ids = rawIds.map(Number).filter(Number.isFinite);
  const unique = [];
  [req.user.id].concat(ids).forEach(function(id) { if (unique.indexOf(id) < 0) unique.push(id); });
  if (unique.length < 3) return res.status(400).json({ error: 'Select at least 2 other users.' });
  const { data: convo } = await supabase.from('conversations').insert({ is_group: true, name, created_by: req.user.id, created_at: now() }).select().single();
  await supabase.from('conversation_members').insert(unique.map(function(userId) { return { conversation_id: convo.id, user_id: userId }; }));
  res.json({ conversationId: convo.id });
});

app.get('/api/conversations/:id/messages', requireAuth, async (req, res) => {
  const convoId = Number(req.params.id);
  const { data: membership } = await supabase.from('conversation_members').select('*').eq('conversation_id', convoId).eq('user_id', req.user.id).single();
  if (!membership) return res.status(404).json({ error: 'Not found' });
  const { data: convo } = await supabase.from('conversations').select('*').eq('id', convoId).single();
  const isGroup = Boolean(convo && convo.is_group);
  const { data: members } = await supabase.from('conversation_members').select('*').eq('conversation_id', convoId);
  const other = (members || []).find(function(m) { return m.user_id !== req.user.id; });
  const { data: msgs } = await supabase.from('messages').select('*').eq('conversation_id', convoId).order('id', { ascending: true });
  const senderIds = [];
  (msgs || []).forEach(function(m) { if (senderIds.indexOf(m.sender_id) < 0) senderIds.push(m.sender_id); });
  const { data: senderUsers } = senderIds.length ? await supabase.from('users').select('id, display_name, avatar_url, accent_color, is_owner, is_admin').in('id', senderIds) : { data: [] };
  const sendersMap = {};
  (senderUsers || []).forEach(function(u) { sendersMap[u.id] = u; });
  const messages = (msgs || []).map(function(m) { const u = sendersMap[m.sender_id]; return { id: m.id, conversation_id: m.conversation_id, sender_id: m.sender_id, body: m.body, media_url: m.media_url, media_type: m.media_type, created_at: m.created_at, display_name: (u && u.display_name) || 'Unknown', avatar_url: (u && u.avatar_url) || '', accent_color: (u && u.accent_color) || '#63d4ff', is_admin: (u && u.is_admin) || false, is_owner: (u && u.is_owner) || false }; });
  res.json({ messages, otherLastSeenAt: isGroup ? '' : ((other && other.last_seen_at) || ''), isGroup, memberCount: (members || []).length });
});

app.post('/api/conversations/:id/messages', requireAuth, uploadMedia.single('media'), async (req, res) => {
  const convoId = Number(req.params.id);
  const { data: membership } = await supabase.from('conversation_members').select('*').eq('conversation_id', convoId).eq('user_id', req.user.id).single();
  if (!membership) return res.status(404).json({ error: 'Not found' });
  const body = sanitizeText(req.body.text, 5000);
  let media_url = '', media_type = '';
  if (req.file) { const filename = 'msg-' + Date.now() + '-' + nanoid(10) + path.extname(req.file.originalname); media_url = await uploadToStorage(req.file.buffer, filename, 'messages'); media_type = req.file.mimetype; }
  if (!body && !media_url) return res.status(400).json({ error: 'Message is empty.' });
  const { data: message } = await supabase.from('messages').insert({ conversation_id: convoId, sender_id: req.user.id, body, media_url, media_type, created_at: now() }).select().single();
  const { data: user } = await supabase.from('users').select('*').eq('id', req.user.id).single();
  res.json({ message: { id: message.id, conversation_id: message.conversation_id, sender_id: message.sender_id, body: message.body, media_url: message.media_url, media_type: message.media_type, created_at: message.created_at, display_name: (user && user.display_name) || 'Unknown', avatar_url: (user && user.avatar_url) || '', accent_color: (user && user.accent_color) || '#63d4ff', is_admin: (user && user.is_admin) || false, is_owner: (user && user.is_owner) || false } });
});

app.post('/api/conversations/:id/seen', requireAuth, async (req, res) => {
  const convoId = Number(req.params.id);
  await supabase.from('conversation_members').update({ last_seen_at: now() }).eq('conversation_id', convoId).eq('user_id', req.user.id);
  res.json({ ok: true });
});

app.use(function(err, req, res, next) { if (!err) return next(); res.status(400).json({ error: err.message || 'Error' }); });

module.exports = app;