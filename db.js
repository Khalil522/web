const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'db.json');

const defaultData = {
  counters: {
    users: 0,
    products: 0,
    posts: 0,
    conversations: 0,
    messages: 0,
    comments: 0
  },
  settings: {
    hero_title: 'This Is My World',
    hero_subtitle: 'Products, moments, and the people I vibe with.',
    about_text:
      'Welcome to my space on the internet. Here you can see my products, my posts, and message me directly.'
  },
  users: [],
  products: [],
  posts: [],
  conversations: [],
  conversationMembers: [],
  messages: []
};

const loadDb = () => {
  if (!fs.existsSync(dbPath)) {
    const initial = JSON.parse(JSON.stringify(defaultData));
    fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...defaultData,
      ...parsed,
      counters: { ...defaultData.counters, ...(parsed.counters || {}) },
      settings: { ...defaultData.settings, ...(parsed.settings || {}) },
      users: Array.isArray(parsed.users) ? parsed.users : [],
      products: Array.isArray(parsed.products) ? parsed.products : [],
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
      conversationMembers: Array.isArray(parsed.conversationMembers) ? parsed.conversationMembers : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : []
    };
  } catch (err) {
    const fallback = JSON.parse(JSON.stringify(defaultData));
    fs.writeFileSync(dbPath, JSON.stringify(fallback, null, 2));
    return fallback;
  }
};

const data = loadDb();

const saveDb = () => {
  const tempPath = dbPath + '.tmp';
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
  fs.renameSync(tempPath, dbPath);
};

const nextId = (key) => {
  if (!data.counters[key]) data.counters[key] = 0;
  data.counters[key] += 1;
  return data.counters[key];
};

module.exports = {
  data,
  saveDb,
  nextId
};
