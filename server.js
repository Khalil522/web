require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { nanoid } = require('nanoid');
const { data, saveDb, nextId } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');
const avatarDir = path.join(uploadsDir, 'avatars');
const mediaDir = path.join(uploadsDir, 'media');
const backgroundDir = path.join(uploadsDir, 'backgrounds');
const sessionsDir = path.join(dataDir, 'sessions');

for (const dir of [dataDir, uploadsDir, avatarDir, mediaDir, backgroundDir, sessionsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new FileStore({ path: sessionsDir }),
    secret: process.env.SESSION_SECRET || 'dev-secret-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax'
    }
  })
);

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10);
    cb(null, `avatar-${Date.now()}-${nanoid(10)}${ext}`);
  }
});

const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, mediaDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10);
    cb(null, `media-${Date.now()}-${nanoid(10)}${ext}`);
  }
});

const backgroundStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, backgroundDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10);
    cb(null, `bg-${Date.now()}-${nanoid(10)}${ext}`);
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed.'));
    }
    cb(null, true);
  }
});

const uploadMedia = multer({
  storage: mediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/') ||
      file.mimetype.startsWith('audio/') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/zip' ||
      file.mimetype === 'text/plain';
    if (!ok) {
      return cb(new Error('Unsupported file type.'));
    }
    cb(null, true);
  }
});

const uploadImage = multer({
  storage: mediaStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed.'));
    }
    cb(null, true);
  }
});

const uploadBackground = multer({
  storage: backgroundStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed.'));
    }
    cb(null, true);
  }
});

app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

const now = () => new Date().toISOString();

const sanitizeText = (value, max = 5000) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
};

const normalizeUser = (user) => {
  const glassOpacity = Number(user.glass_opacity);
  const cardRadius = Number(user.card_radius);
  const pfpRadius = Number(user.pfp_radius);
  return {
    ...user,
    is_admin: Boolean(user.is_admin),
    is_owner: Boolean(user.is_owner),
    banned_until: user.banned_until || '',
    theme_accent: user.theme_accent || '#7dd3fc',
    theme_surface: user.theme_surface || '#14181f',
    theme_bg: user.theme_bg || '#0b0f14',
    glass_opacity: Number.isFinite(glassOpacity) ? glassOpacity : 0.16,
    card_radius: Number.isFinite(cardRadius) ? cardRadius : 18,
    pfp_radius: Number.isFinite(pfpRadius) ? pfpRadius : 50,
    profile_bg_url: user.profile_bg_url || ''
  };
};

const isAdminUser = (user) => Boolean(user && (user.is_owner || user.is_admin));

const isBanned = (user) => {
  if (!user || !user.banned_until) return false;
  if (user.banned_until === 'forever') return true;
  return new Date(user.banned_until) > new Date();
};

const ensurePostFields = (post) => {
  if (!Array.isArray(post.likes)) post.likes = [];
  if (!Array.isArray(post.comments)) post.comments = [];
  return post;
};

let needsSave = false;
data.users.forEach((user) => {
  if (typeof user.is_admin === 'undefined') {
    user.is_admin = Boolean(user.is_owner);
    needsSave = true;
  }
  if (typeof user.banned_until === 'undefined') {
    user.banned_until = '';
    needsSave = true;
  }
  if (typeof user.theme_accent === 'undefined') {
    user.theme_accent = '#7dd3fc';
    needsSave = true;
  }
  if (typeof user.theme_surface === 'undefined') {
    user.theme_surface = '#14181f';
    needsSave = true;
  }
  if (typeof user.theme_bg === 'undefined') {
    user.theme_bg = '#0b0f14';
    needsSave = true;
  }
  if (typeof user.glass_opacity === 'undefined') {
    user.glass_opacity = 0.16;
    needsSave = true;
  }
  if (typeof user.card_radius === 'undefined') {
    user.card_radius = 18;
    needsSave = true;
  }
  if (typeof user.pfp_radius === 'undefined') {
    user.pfp_radius = 50;
    needsSave = true;
  }
  if (typeof user.profile_bg_url === 'undefined') {
    user.profile_bg_url = '';
    needsSave = true;
  }
});
data.products.forEach((product) => {
  if (typeof product.price === 'undefined') {
    product.price = '';
    needsSave = true;
  }
  if (typeof product.link === 'undefined') {
    product.link = '';
    needsSave = true;
  }
});
data.posts.forEach((post) => {
  if (!Array.isArray(post.likes)) {
    post.likes = [];
    needsSave = true;
  }
  if (!Array.isArray(post.comments)) {
    post.comments = [];
    needsSave = true;
  }
});
data.conversations.forEach((convo) => {
  if (typeof convo.is_group === 'undefined') {
    convo.is_group = false;
    needsSave = true;
  }
  if (typeof convo.name === 'undefined') {
    convo.name = '';
    needsSave = true;
  }
  if (typeof convo.created_by === 'undefined') {
    convo.created_by = 0;
    needsSave = true;
  }
});
if (needsSave) {
  saveDb();
}

const getUserById = (id) => {
  const user = data.users.find((u) => u.id === id);
  if (!user) return null;
  const normalized = normalizeUser(user);
  const { password_hash, ...safe } = normalized;
  return safe;
};

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = getUserById(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (isBanned(user)) {
    req.session.destroy(() => {});
    return res.status(403).json({ error: 'Banned' });
  }
  req.user = user;
  next();
};

const requireOwner = (req, res, next) => {
  if (!req.user || !req.user.is_owner) {
    return res.status(403).json({ error: 'Owner only' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
};

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = getUserById(req.session.userId);
  if (!user) return res.json({ user: null });
  if (isBanned(user)) {
    req.session.destroy(() => {});
    return res.status(403).json({ user: null, error: 'Banned' });
  }
  res.json({ user });
});

app.post('/api/auth/register', (req, res) => {
  const email = sanitizeText(req.body.email, 200).toLowerCase();
  const password = String(req.body.password || '');
  const displayName = sanitizeText(req.body.displayName, 80);
  const remember = Boolean(req.body.remember);

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  if (!displayName) {
    return res.status(400).json({ error: 'Display name is required.' });
  }

  const existing = data.users.find((u) => u.email === email);
  if (existing) {
    return res.status(409).json({ error: 'Email already in use.' });
  }

  const totalUsers = data.users.length;
  const ownerEmail = (process.env.OWNER_EMAIL || '').toLowerCase().trim();
  const allowFirstOwner = process.env.ALLOW_FIRST_OWNER !== 'false';
  const isOwner = ownerEmail ? email === ownerEmail : allowFirstOwner && totalUsers === 0;

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = {
    id: nextId('users'),
    email,
    password_hash: passwordHash,
    display_name: displayName,
    bio: '',
    avatar_url: '',
    accent_color: '#63d4ff',
    language: 'en',
    is_owner: isOwner,
    is_admin: isOwner,
    banned_until: '',
    theme_accent: '#7dd3fc',
    theme_surface: '#14181f',
    theme_bg: '#0b0f14',
    glass_opacity: 0.16,
    card_radius: 18,
    pfp_radius: 50,
    profile_bg_url: '',
    created_at: now()
  };
  data.users.push(user);
  saveDb();

  req.session.userId = user.id;
  if (remember) {
    req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30;
  }

  const safeUser = getUserById(user.id);
  res.json({ user: safeUser });
});

app.post('/api/auth/login', (req, res) => {
  const email = sanitizeText(req.body.email, 200).toLowerCase();
  const password = String(req.body.password || '');
  const remember = Boolean(req.body.remember);

  const userRow = data.users.find((u) => u.email === email);
  if (!userRow) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  const normalized = normalizeUser(userRow);
  if (isBanned(normalized)) {
    return res.status(403).json({ error: 'Banned' });
  }
  const ok = bcrypt.compareSync(password, userRow.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  req.session.userId = userRow.id;
  if (remember) {
    req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30;
  }

  const user = getUserById(userRow.id);
  res.json({ user });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get('/api/settings', (req, res) => {
  res.json({ settings: data.settings });
});

app.patch('/api/settings', requireAuth, requireOwner, (req, res) => {
  const allowed = ['hero_title', 'hero_subtitle', 'about_text'];
  for (const key of allowed) {
    if (key in req.body) {
      data.settings[key] = sanitizeText(req.body[key], 2000);
    }
  }
  saveDb();
  res.json({ ok: true });
});

app.get('/api/users', requireAuth, (req, res) => {
  const users = data.users.map((user) => {
    const normalized = normalizeUser(user);
    const { password_hash, ...safe } = normalized;
    return safe;
  });
  users.sort((a, b) => Number(b.is_owner) - Number(a.is_owner));
  res.json({ users });
});

app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  const users = data.users.map((user) => {
    const normalized = normalizeUser(user);
    const { password_hash, ...safe } = normalized;
    return safe;
  });
  users.sort((a, b) => Number(b.is_owner) - Number(a.is_owner));
  res.json({ users });
});

app.post('/api/admin/users/:id/admin', requireAuth, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const makeAdmin = Boolean(req.body.is_admin);
  const idx = data.users.findIndex((u) => u.id === id);
  if (idx === -1) return res.status(404).json({ error: 'User not found.' });
  if (data.users[idx].is_owner) {
    return res.status(403).json({ error: 'Cannot change owner role.' });
  }
  data.users[idx].is_admin = makeAdmin;
  saveDb();
  res.json({ ok: true });
});

app.post('/api/admin/users/:id/ban', requireAuth, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const duration = String(req.body.duration || '');
  const idx = data.users.findIndex((u) => u.id === id);
  if (idx === -1) return res.status(404).json({ error: 'User not found.' });
  if (data.users[idx].is_owner) {
    return res.status(403).json({ error: 'Cannot ban the owner.' });
  }
  if (data.users[idx].id === req.user.id) {
    return res.status(403).json({ error: 'Cannot ban yourself.' });
  }

  if (duration === 'forever') {
    data.users[idx].banned_until = 'forever';
  } else {
    const days = Number(duration);
    if (!Number.isFinite(days) || days <= 0) {
      return res.status(400).json({ error: 'Invalid duration.' });
    }
    data.users[idx].banned_until = new Date(Date.now() + days * 86400000).toISOString();
  }
  saveDb();
  res.json({ ok: true, banned_until: data.users[idx].banned_until });
});

app.post('/api/admin/users/:id/unban', requireAuth, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const idx = data.users.findIndex((u) => u.id === id);
  if (idx === -1) return res.status(404).json({ error: 'User not found.' });
  data.users[idx].banned_until = '';
  saveDb();
  res.json({ ok: true });
});

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid user.' });
  const user = data.users.find((u) => u.id === id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.is_owner) {
    return res.status(403).json({ error: 'Cannot delete the owner.' });
  }
  if (req.user.id === id) {
    return res.status(403).json({ error: 'Cannot delete yourself.' });
  }

  data.users = data.users.filter((u) => u.id !== id);
  data.posts = data.posts.filter((p) => p.user_id !== id);
  data.posts.forEach((post) => {
    ensurePostFields(post);
    post.likes = post.likes.filter((uid) => uid !== id);
    post.comments = post.comments.filter((comment) => comment.user_id !== id);
  });

  data.messages = data.messages.filter((m) => m.sender_id !== id);
  data.conversationMembers = data.conversationMembers.filter((cm) => cm.user_id !== id);

  const memberCounts = new Map();
  data.conversationMembers.forEach((cm) => {
    memberCounts.set(cm.conversation_id, (memberCounts.get(cm.conversation_id) || 0) + 1);
  });
  const validConvoIds = new Set(
    data.conversations.filter((c) => (memberCounts.get(c.id) || 0) >= 2).map((c) => c.id)
  );
  data.conversations = data.conversations.filter((c) => validConvoIds.has(c.id));
  data.messages = data.messages.filter((m) => validConvoIds.has(m.conversation_id));

  saveDb();
  res.json({ ok: true });
});

app.patch('/api/users/me', requireAuth, (req, res) => {
  const displayName = sanitizeText(req.body.displayName, 80);
  const bio = sanitizeText(req.body.bio, 500);
  const accentColor = sanitizeText(req.body.accentColor, 20);
  const language = sanitizeText(req.body.language, 5);
  const themeAccent = sanitizeText(req.body.themeAccent, 20);
  const themeSurface = sanitizeText(req.body.themeSurface, 20);
  const themeBg = sanitizeText(req.body.themeBg, 20);
  const glassOpacity = Number(req.body.glassOpacity);
  const cardRadius = Number(req.body.cardRadius);
  const pfpRadius = Number(req.body.pfpRadius);

  const idx = data.users.findIndex((u) => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found.' });

  if (displayName) data.users[idx].display_name = displayName;
  if (bio) data.users[idx].bio = bio;
  if (accentColor) data.users[idx].accent_color = accentColor;
  if (language) data.users[idx].language = language;
  if (themeAccent) data.users[idx].theme_accent = themeAccent;
  if (themeSurface) data.users[idx].theme_surface = themeSurface;
  if (themeBg) data.users[idx].theme_bg = themeBg;
  if (Number.isFinite(glassOpacity)) {
    data.users[idx].glass_opacity = Math.min(0.3, Math.max(0.08, glassOpacity));
  }
  if (Number.isFinite(cardRadius)) {
    data.users[idx].card_radius = Math.min(32, Math.max(10, cardRadius));
  }
  if (Number.isFinite(pfpRadius)) {
    data.users[idx].pfp_radius = Math.min(50, Math.max(0, pfpRadius));
  }

  saveDb();
  const user = getUserById(req.user.id);
  res.json({ user });
});

app.post('/api/users/me/avatar', requireAuth, uploadAvatar.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const url = `/uploads/avatars/${req.file.filename}`;
  const idx = data.users.findIndex((u) => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found.' });
  data.users[idx].avatar_url = url;
  saveDb();
  const user = getUserById(req.user.id);
  res.json({ user });
});

app.post('/api/users/me/background', requireAuth, uploadBackground.single('background'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const url = `/uploads/backgrounds/${req.file.filename}`;
  const idx = data.users.findIndex((u) => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found.' });
  data.users[idx].profile_bg_url = url;
  saveDb();
  const user = getUserById(req.user.id);
  res.json({ user });
});

app.get('/api/products', (req, res) => {
  const products = [...data.products].sort((a, b) => b.id - a.id);
  res.json({ products });
});

app.post('/api/products', requireAuth, requireOwner, uploadImage.single('image'), (req, res) => {
  const title = sanitizeText(req.body.title, 120);
  const description = sanitizeText(req.body.description, 1000);
  const price = sanitizeText(req.body.price, 40);
  const link = sanitizeText(req.body.link, 300);
  if (!title) return res.status(400).json({ error: 'Title is required.' });
  const imageUrl = req.file ? `/uploads/media/${req.file.filename}` : '';
  const ts = now();
  const product = {
    id: nextId('products'),
    title,
    description,
    price,
    link,
    image_url: imageUrl,
    created_at: ts,
    updated_at: ts
  };
  data.products.push(product);

  const post = {
    id: nextId('posts'),
    user_id: req.user.id,
    content: title,
    media_url: imageUrl,
    media_type: req.file ? req.file.mimetype : '',
    likes: [],
    comments: [],
    created_at: ts
  };
  data.posts.push(post);
  saveDb();
  res.json({ product });
});

app.patch('/api/products/:id', requireAuth, requireOwner, uploadImage.single('image'), (req, res) => {
  const id = Number(req.params.id);
  const title = sanitizeText(req.body.title, 120);
  const description = sanitizeText(req.body.description, 1000);
  const price = sanitizeText(req.body.price, 40);
  const link = sanitizeText(req.body.link, 300);
  const idx = data.products.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  if (title) data.products[idx].title = title;
  if (description) data.products[idx].description = description;
  if (price) data.products[idx].price = price;
  if (link) data.products[idx].link = link;
  if (req.file) data.products[idx].image_url = `/uploads/media/${req.file.filename}`;
  data.products[idx].updated_at = now();
  saveDb();
  res.json({ product: data.products[idx] });
});

app.delete('/api/products/:id', requireAuth, requireOwner, (req, res) => {
  const id = Number(req.params.id);
  data.products = data.products.filter((p) => p.id !== id);
  saveDb();
  res.json({ ok: true });
});

app.get('/api/posts', requireAuth, (req, res) => {
  const posts = [...data.posts]
    .sort((a, b) => b.id - a.id)
    .slice(0, 100)
    .map((post) => {
      const normalized = ensurePostFields(post);
      const user = data.users.find((u) => u.id === post.user_id);
      const likes = normalized.likes || [];
      const comments = (normalized.comments || []).map((comment) => {
        const author = data.users.find((u) => u.id === comment.user_id);
        return {
          ...comment,
          display_name: author?.display_name || 'Unknown',
          avatar_url: author?.avatar_url || '',
          is_admin: author?.is_admin || false,
          is_owner: author?.is_owner || false
        };
      });
      return {
        ...normalized,
        user_id: post.user_id,
        display_name: user?.display_name || 'Unknown',
        avatar_url: user?.avatar_url || '',
        accent_color: user?.accent_color || '#63d4ff',
        is_owner: user?.is_owner || false,
        is_admin: user?.is_admin || false,
        likes_count: likes.length,
        liked_by_me: likes.includes(req.user.id),
        comments
      };
    });
  res.json({ posts });
});

app.post('/api/posts', requireAuth, requireAdmin, uploadMedia.single('media'), (req, res) => {
  const content = sanitizeText(req.body.content, 2000);
  const mediaUrl = req.file ? `/uploads/media/${req.file.filename}` : '';
  const mediaType = req.file ? req.file.mimetype : '';
  const post = {
    id: nextId('posts'),
    user_id: req.user.id,
    content,
    media_url: mediaUrl,
    media_type: mediaType,
    likes: [],
    comments: [],
    created_at: now()
  };
  data.posts.push(post);
  saveDb();

  const user = data.users.find((u) => u.id === post.user_id);
  res.json({
    post: {
      ...post,
      display_name: user?.display_name || 'Unknown',
      avatar_url: user?.avatar_url || '',
      accent_color: user?.accent_color || '#63d4ff',
      is_owner: user?.is_owner || false
    }
  });
});

app.delete('/api/posts/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const post = data.posts.find((p) => p.id === id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  if (post.user_id !== req.user.id && !req.user.is_owner) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  data.posts = data.posts.filter((p) => p.id !== id);
  saveDb();
  res.json({ ok: true });
});

app.post('/api/posts/:id/like', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const post = data.posts.find((p) => p.id === id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  ensurePostFields(post);
  const idx = post.likes.indexOf(req.user.id);
  if (idx >= 0) {
    post.likes.splice(idx, 1);
  } else {
    post.likes.push(req.user.id);
  }
  saveDb();
  res.json({ likes_count: post.likes.length, liked_by_me: post.likes.includes(req.user.id) });
});

app.post('/api/posts/:id/comments', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const post = data.posts.find((p) => p.id === id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  const text = sanitizeText(req.body.text, 500);
  if (!text) return res.status(400).json({ error: 'Comment is empty.' });
  ensurePostFields(post);
  const comment = {
    id: nextId('comments'),
    user_id: req.user.id,
    text,
    created_at: now()
  };
  post.comments.push(comment);
  saveDb();
  const author = data.users.find((u) => u.id === req.user.id);
  res.json({
    comment: {
      ...comment,
      display_name: author?.display_name || 'Unknown',
      avatar_url: author?.avatar_url || '',
      is_admin: author?.is_admin || false,
      is_owner: author?.is_owner || false
    }
  });
});

app.get('/api/conversations', requireAuth, (req, res) => {
  const convoIds = data.conversationMembers
    .filter((cm) => cm.user_id === req.user.id)
    .map((cm) => cm.conversation_id);

  const conversations = convoIds.map((id) => {
    const convo = data.conversations.find((c) => c.id === id) || { id, created_at: '' };
    const members = data.conversationMembers.filter((cm) => cm.conversation_id === id);
    const selfMember = members.find((m) => m.user_id === req.user.id);
    const otherMembers = members.filter((m) => m.user_id !== req.user.id);
    const memberUsers = members
      .map((m) => data.users.find((u) => u.id === m.user_id))
      .filter(Boolean);
    const otherUsers = memberUsers.filter((u) => u.id !== req.user.id);
    const otherUser = otherUsers[0];
    const isGroup = Boolean(convo.is_group) || otherUsers.length > 1;
    const messages = data.messages.filter((m) => m.conversation_id === id);
    const last = messages[messages.length - 1];
    const lastSender = last ? data.users.find((u) => u.id === last.sender_id) : null;

    const unread = messages.filter((m) => {
      if (m.sender_id === req.user.id) return false;
      if (!selfMember?.last_seen_at) return true;
      return m.created_at > selfMember.last_seen_at;
    }).length;

    const otherMember = otherMembers[0];
    const seen =
      !isGroup &&
      last &&
      last.sender_id === req.user.id &&
      otherMember?.last_seen_at &&
      otherMember.last_seen_at >= last.created_at;

    const displayName = isGroup
      ? convo.name ||
        otherUsers
          .map((u) => u.display_name)
          .filter(Boolean)
          .slice(0, 3)
          .join(', ') ||
        'Group chat'
      : otherUser?.display_name || 'Unknown';
    const memberAvatars = otherUsers
      .map((u) => u.avatar_url)
      .filter(Boolean)
      .slice(0, 3);
    const memberNames = otherUsers
      .map((u) => u.display_name)
      .filter(Boolean)
      .slice(0, 3);

    return {
      id,
      is_group: isGroup,
      group_name: convo.name || '',
      member_count: members.length,
      member_avatars: memberAvatars,
      member_names: memberNames,
      other_id: isGroup ? 0 : otherUser?.id || 0,
      display_name: displayName,
      avatar_url: isGroup ? '' : otherUser?.avatar_url || '',
      accent_color: isGroup ? '#63d4ff' : otherUser?.accent_color || '#63d4ff',
      is_admin: isGroup ? false : otherUser?.is_admin || false,
      is_owner: isGroup ? false : otherUser?.is_owner || false,
      other_last_seen_at: isGroup ? '' : otherMember?.last_seen_at || '',
      self_last_seen_at: selfMember?.last_seen_at || '',
      last_body: last?.body || '',
      last_media_url: last?.media_url || '',
      last_media_type: last?.media_type || '',
      last_created_at: last?.created_at || '',
      last_sender_id: last?.sender_id || 0,
      last_sender_name: lastSender?.display_name || '',
      unread_count: unread,
      seen: Boolean(seen)
    };
  });

  conversations.sort((a, b) => {
    if (!a.last_created_at && b.last_created_at) return 1;
    if (a.last_created_at && !b.last_created_at) return -1;
    if (!a.last_created_at && !b.last_created_at) return 0;
    return new Date(b.last_created_at) - new Date(a.last_created_at);
  });

  res.json({ conversations });
});

app.post('/api/conversations', requireAuth, (req, res) => {
  const otherId = Number(req.body.userId);
  if (!otherId || otherId === req.user.id) {
    return res.status(400).json({ error: 'Invalid user.' });
  }
  const otherUser = data.users.find((u) => u.id === otherId);
  if (!otherUser) return res.status(404).json({ error: 'User not found.' });

  const existing = data.conversations.find((c) => {
    const members = data.conversationMembers.filter((cm) => cm.conversation_id === c.id);
    const ids = members.map((m) => m.user_id);
    return ids.includes(req.user.id) && ids.includes(otherId);
  });

  if (existing) return res.json({ conversationId: existing.id });

  const convoId = nextId('conversations');
  data.conversations.push({
    id: convoId,
    created_at: now(),
    is_group: false,
    name: '',
    created_by: req.user.id
  });
  data.conversationMembers.push({
    conversation_id: convoId,
    user_id: req.user.id,
    last_seen_at: ''
  });
  data.conversationMembers.push({
    conversation_id: convoId,
    user_id: otherId,
    last_seen_at: ''
  });
  saveDb();

  res.json({ conversationId: convoId });
});

app.post('/api/conversations/group', requireAuth, (req, res) => {
  const name = sanitizeText(req.body.name, 80);
  const rawIds = Array.isArray(req.body.userIds) ? req.body.userIds : [];
  const ids = rawIds.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  const unique = new Set([req.user.id, ...ids]);
  const members = [...unique].filter((id) => data.users.find((u) => u.id === id));

  if (members.length < 3) {
    return res.status(400).json({ error: 'Select at least 2 other users.' });
  }

  const convoId = nextId('conversations');
  data.conversations.push({
    id: convoId,
    created_at: now(),
    is_group: true,
    name,
    created_by: req.user.id
  });
  members.forEach((userId) => {
    data.conversationMembers.push({
      conversation_id: convoId,
      user_id: userId,
      last_seen_at: ''
    });
  });
  saveDb();

  res.json({ conversationId: convoId });
});

app.get('/api/conversations/:id/messages', requireAuth, (req, res) => {
  const convoId = Number(req.params.id);
  const membership = data.conversationMembers.find(
    (cm) => cm.conversation_id === convoId && cm.user_id === req.user.id
  );
  if (!membership) return res.status(404).json({ error: 'Not found' });

  const convo = data.conversations.find((c) => c.id === convoId);
  const isGroup = Boolean(convo?.is_group);
  const members = data.conversationMembers.filter((cm) => cm.conversation_id === convoId);
  const other = members.find((cm) => cm.user_id !== req.user.id);

  const messages = data.messages
    .filter((m) => m.conversation_id === convoId)
    .sort((a, b) => a.id - b.id)
    .map((m) => {
      const user = data.users.find((u) => u.id === m.sender_id);
      return {
        ...m,
        display_name: user?.display_name || 'Unknown',
        avatar_url: user?.avatar_url || '',
        accent_color: user?.accent_color || '#63d4ff',
        is_admin: user?.is_admin || false,
        is_owner: user?.is_owner || false
      };
    });

  res.json({
    messages,
    otherLastSeenAt: isGroup ? '' : other?.last_seen_at || '',
    isGroup,
    memberCount: members.length
  });
});

app.post('/api/conversations/:id/messages', requireAuth, uploadMedia.single('media'), (req, res) => {
  const convoId = Number(req.params.id);
  const membership = data.conversationMembers.find(
    (cm) => cm.conversation_id === convoId && cm.user_id === req.user.id
  );
  if (!membership) return res.status(404).json({ error: 'Not found' });

  const body = sanitizeText(req.body.text, 5000);
  const mediaUrl = req.file ? `/uploads/media/${req.file.filename}` : '';
  const mediaType = req.file ? req.file.mimetype : '';

  if (!body && !mediaUrl) {
    return res.status(400).json({ error: 'Message is empty.' });
  }

  const message = {
    id: nextId('messages'),
    conversation_id: convoId,
    sender_id: req.user.id,
    body,
    media_url: mediaUrl,
    media_type: mediaType,
    created_at: now()
  };
  data.messages.push(message);
  saveDb();

  const user = data.users.find((u) => u.id === message.sender_id);
  res.json({
    message: {
      ...message,
      display_name: user?.display_name || 'Unknown',
      avatar_url: user?.avatar_url || '',
      accent_color: user?.accent_color || '#63d4ff',
      is_admin: user?.is_admin || false,
      is_owner: user?.is_owner || false
    }
  });
});

app.post('/api/conversations/:id/seen', requireAuth, (req, res) => {
  const convoId = Number(req.params.id);
  const idx = data.conversationMembers.findIndex(
    (cm) => cm.conversation_id === convoId && cm.user_id === req.user.id
  );
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.conversationMembers[idx].last_seen_at = now();
  saveDb();
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  if (!err) return next();
  res.status(400).json({ error: err.message || 'Error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
