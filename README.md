# About Me Site

This is a full-stack personal website with memes (products), posts, profiles, and private messages.

## Run

1. Install dependencies:

```
cd C:\Users\david\Desktop\about-me-site
npm install
```

2. Create a `.env` file based on `.env.example` and set:
- `SESSION_SECRET` (any long random string)
- `OWNER_EMAIL` (your email so you are the owner)

3. Start:

```
npm run dev
```

Open: http://localhost:3000

## Notes
- Passwords are hashed (not stored in plain text).
- Files are saved locally in `uploads/`.
- Data is stored in `data/db.json`.
- Sessions are stored in `data/sessions/`.
