# Family Health Log

GitHub Pages + Firebase. No backend needed.

## 📋 Quick Start

**Option 1: Test Locally (30 sec)**
```bash
cd family-health-log
python -m http.server 8000
# Visit: http://localhost:8000
```

**Option 2: Deploy to GitHub Pages (3 min)**
```bash
git add .
git commit -m "Add pregnancy journal"
git push origin main
```
Then: Settings → Pages → Deploy from a branch (main) → Save

After 1-2 min: `https://your-username.github.io/family-health-log/`

## 🔑 Password
`hyunjinjakob`

## 📝 Features
- Write entries with markdown
- Tag with auto-suggestions  
- Calendar view
- Summary stats
- Export/import as JSON
- Firebase syncs everything

## 📁 Files
- `index.html` - App UI
- `app.js` - Frontend logic
- `styles.css` - Styling
- `.nojekyll` - GitHub Pages config

Password stored in `app.js` line 2. Change it and push to update.

All data synced to Firebase Realtime Database (family-health-log-f9af4).
