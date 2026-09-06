# 🤍 Pregnancy Journal - GitHub Pages Edition

A markdown pregnancy journal with tags, calendar view, and summaries.

**Runs 100% in the browser. No backend server needed.**

---

## 🚀 Deploy to GitHub Pages (3 Minutes)

### Step 1: Enable GitHub Pages

1. Go to your GitHub repo
2. Click **Settings** → **Pages**
3. Under "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **main** (or **master**)
   - Folder: **/root** (or **/(root)**)
4. Click **Save**

That's it! Your site is now live at: **https://your-username.github.io/family-health-log/**

### Step 2: Verify It Works

1. Wait ~1 minute for deployment
2. Visit: **https://your-username.github.io/family-health-log/**
3. Log in with password: **hyunjinjakob**

---

## 📝 Features

✅ **Write Entries** — Markdown with tags  
✅ **Calendar View** — See tags for each day  
✅ **Summary Stats** — Total entries and streaks  
✅ **Tag Auto-Suggest** — From past entries  
✅ **Password Protected** — Local storage only  
✅ **Cloud Sync** — Firebase Realtime Database  
✅ **Export/Import** — Backup as JSON  

---

## 🔐 How It Works

**100% Frontend + Firebase Web SDK**

```
You type in browser
    ↓
JavaScript in browser
    ↓
Firebase SDK (direct connection)
    ↓
Firebase Realtime Database
    ↓
Data syncs across all devices
```

No server. No backend. Just static files + Firebase.

---

## 📁 Project Files

```
family-health-log/
├── index.html           ← Your app
├── app.js              ← Frontend logic
├── styles.css          ← Styling
├── .nojekyll           ← Tells GitHub Pages not to use Jekyll
└── .gitignore          ← Protects secrets
```

---

## 🔑 Password

Default: **hyunjinjakob**

To change:
1. Edit `app.js`
2. Find: `const PASSWORD = 'hyunjinjakob';`
3. Change to your password
4. Git push

---

## 💾 Data Storage

All data stored in Firebase Realtime Database:
- **Project:** family-health-log-f9af4
- **Database:** https://family-health-log-f9af4-default-rtdb.europe-west1.firebasedatabase.app
- **Data path:** `/entries/{YYYY-MM-DD}`

Firebase is public for reads/writes (no authentication) so password login is for UI only.

---

## 📊 Entry Structure

Each entry is stored at `/entries/2026-09-06`:

```json
{
  "date": "2026-09-06",
  "tags": ["nausea", "checkup"],
  "text": "## How I'm feeling\n\n- Energy: low\n- Grateful for: partner",
  "updatedAt": "2026-09-06T18:32:10.123Z"
}
```

---

## 🚀 Make Changes

After making changes to code:

```bash
git add .
git commit -m "Your message"
git push origin main
```

GitHub Pages auto-deploys your changes!

---

## 🆘 Troubleshooting

### "Page not found"

Check GitHub Pages settings:
1. Go to **Settings** → **Pages**
2. Verify Source is set to a branch
3. Wait ~1 minute for deployment
4. Check **Actions** tab for build status

### "Can't see my entries"

Entries are stored in Firebase. Check:
1. Are you logged in? (password: hyunjinjakob)
2. Check browser console (F12 → Console) for errors
3. Verify Firebase project: family-health-log-f9af4

### "Entries disappeared"

Entries are stored in Firebase's database. They persist across:
- Different browsers
- Different devices
- Browser refresh
- Computer restart

To see your entries again, just log in with the same password.

---

## 📞 Support

- Check browser console (F12) for error messages
- Verify Firebase project exists: family-health-log-f9af4
- Check GitHub Pages deployment status: **Settings** → **Pages**

---

## 🎉 You're Done!

Your pregnancy journal is now live!

**Access at:** https://your-username.github.io/family-health-log/

**Password:** hyunjinjakob

Enjoy! 🤍
