# THSG - Tlemcen High Schools Group

> Made by louay\_.idk (60%) with the help of AI (40%) 🐱

## 📁 Project Structure

```
about-me-site/
│
├── 📄 vercel.json          ← Vercel deployment config
├── 📄 package.json         ← Dependencies
├── 📄 .env.example         ← Environment variables template
├── 📄 .gitignore
│
├── 📁 api/                 ← Backend (Node.js + Express)
│   └── index.js            ← Server (741 lines, labeled sections)
│       ├── SECTION 1: Setup \& Middleware
│       ├── SECTION 2: Auth Routes (login/register/logout)
│       ├── SECTION 3: Settings \& Users
│       ├── SECTION 4: Admin
│       ├── SECTION 5: Products
│       ├── SECTION 6: Posts (likes + comments)
│       ├── SECTION 7: Conversations \& Messages
│       └── SECTION 8: Error Handler
│
├── 📁 public/              ← Frontend
│   ├── index.html          ← Main HTML
│   ├── styles.css          ← Maste





r CSS (imports all below)
│   │
│   ├── 📁 css/             ← CSS split by feature
│   │   ├── base.css        ← Variables, reset, animations
│   │   ├── auth.css        ← Login/signup modal
│   │   ├── layout.css      ← Sidebar, topbar, main layout
│   │   ├── components.css  ← Buttons, inputs, chips
│   │   ├── home.css        ← Welcome banner, news cards
│   │   ├── feed.css        ← Posts, comments
│   │   ├── messages.css    ← DMs, Instagram-style chat
│   │   ├── profile.css     ← Profile hero
│   │   ├── admin.css       ← Admin panel
│   │   ├── modals.css      ← Lightbox, share, toast
│   │   └── responsive.css  ← Mobile/tablet breakpoints
│   │
│   ├── 📁 js/              ← JavaScript split by feature
│   │   ├── state.js        ← Global state (20 lines)
│   │   ├── utils.js        ← Theme, translations, helpers (230 lines)
│   │   ├── api.js          ← apiFetch + token management (36 lines)
│   │   ├── feed.js         ← Posts + products render (247 lines)
│   │   ├── messages.js     ← Chat + conversations (348 lines)
│   │   ├── admin.js        ← Admin panel render (225 lines)
│   │   ├── setup.js        ← Event listeners (355 lines)
│   │   └── main.js         ← Bootstrap + onLogin (94 lines)
│   │
│   └── i18n.js             ← Translations (AR/EN)

```

## 🚀 Setup

### 1\. Environment Variables (Vercel)

```
SUPABASE\_URL=https://xxx.supabase.co
SUPABASE\_ANON\_KEY=eyJ...
SUPABASE\_KEY=eyJ...  (same as ANON\_KEY)
SESSION\_SECRET=any-random-string
OWNER\_EMAIL=your@email.com
NODE\_ENV=production
```

### 2\. Supabase Tables

Run `supabase\_schema.sql` in Supabase SQL Editor

### 3\. Deploy

```bash
git add .
git commit -m "your message"
git push
```

Vercel auto-deploys on push.

## 🌐 Live Site

https://web-black-phi-89.vercel.app

## 🗄️ Database

Supabase PostgreSQL - tables: users, posts, products, conversations, messages, comments, auth\_tokens, settings

