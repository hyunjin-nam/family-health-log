// server.js
// Express API backed by Firebase Realtime Database
// Reads Firebase service account from FIREBASE_SERVICE_ACCOUNT environment variable
// (Set in GitHub secrets, passed by GitHub Actions to Railway)

const express = require('express');
const cookieParser = require('cookie-parser');
const admin = require('firebase-admin');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Firebase init from environment variable ----
const firebaseServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!firebaseServiceAccountJson) {
  console.error('ERROR: FIREBASE_SERVICE_ACCOUNT environment variable not set.');
  console.error('Set it to the JSON contents of your Firebase service account key.');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(firebaseServiceAccountJson);
} catch (err) {
  console.error('ERROR: FIREBASE_SERVICE_ACCOUNT is not valid JSON:', err.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://family-health-log-f9af4-default-rtdb.europe-west1.firebasedatabase.app'
});

const db = admin.database();

// ---- Auth config ----
const PASSWORD = 'hyunjinjakob';
const AUTH_COOKIE = 'journal_auth';
const AUTH_TOKEN = crypto.createHash('sha256').update(PASSWORD + '::journal-salt').digest('hex');

app.use(express.json());
app.use(cookieParser());

function isValidDate(d) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d + 'T00:00:00'));
}

async function readAllEntries() {
  try {
    const snapshot = await db.ref('entries').once('value');
    const data = snapshot.val();
    if (!data) return [];
    const entries = Object.values(data).sort((a, b) => (a.date < b.date ? 1 : -1));
    return entries;
  } catch (err) {
    console.error('Error reading entries from Firebase:', err);
    return [];
  }
}

// ---- Public routes (no auth required) ----
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (password === PASSWORD) {
    res.cookie(AUTH_COOKIE, AUTH_TOKEN, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Wrong password' });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie(AUTH_COOKIE);
  res.json({ ok: true });
});

// ---- Auth gate for everything below this line ----
function requireAuth(req, res, next) {
  if (req.cookies && req.cookies[AUTH_COOKIE] === AUTH_TOKEN) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  return res.redirect('/login.html');
}
app.use(requireAuth);
app.use(express.static(path.join(__dirname, 'public')));

// ---- GET all entries ----
app.get('/api/entries', async (req, res) => {
  try {
    const entries = await readAllEntries();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- GET distinct tags used so far, for autosuggest ----
app.get('/api/tags', async (req, res) => {
  try {
    const entries = await readAllEntries();
    const counts = {};
    entries.forEach(e => (e.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    const tags = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- GET a single day's entry ----
app.get('/api/entries/:date', async (req, res) => {
  const { date } = req.params;
  if (!isValidDate(date)) return res.status(400).json({ error: 'Invalid date' });
  try {
    const snapshot = await db.ref('entries/' + date).once('value');
    const data = snapshot.val();
    if (!data) return res.status(404).json({ error: 'No entry for this date' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Create or update a day's entry ----
app.put('/api/entries/:date', async (req, res) => {
  const { date } = req.params;
  if (!isValidDate(date)) return res.status(400).json({ error: 'Invalid date' });
  const { tags = [], text = '' } = req.body || {};
  const entry = { date, tags, text, updatedAt: new Date().toISOString() };
  try {
    await db.ref('entries/' + date).set(entry);
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Delete a day's entry ----
app.delete('/api/entries/:date', async (req, res) => {
  const { date } = req.params;
  if (!isValidDate(date)) return res.status(400).json({ error: 'Invalid date' });
  try {
    await db.ref('entries/' + date).remove();
    res.json({ deleted: date });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Journal running at http://localhost:${PORT}`);
  console.log(`Connected to Firebase (family-health-log-f9af4)`);
});
