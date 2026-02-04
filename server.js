// POS Backup Server - Deduplication so sync/restore across devices stays accurate
// npm install express cors && node server.js

const express = require('express');
const cors = require('cors');
const app = express();

const API_KEY = process.env.API_KEY || '12664365001';

app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

function checkApiKey(req, res, next) {
  const key = req.header('X-API-KEY');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

let store = { transactions: [], products: [], cashCounts: [] };

// Helper: upsert products by (storeId, barcode) or (storeId, name) - no duplicates
function upsertProducts(list) {
  for (const p of list) {
    const sid = p.storeId || '';
    const key = (p.barcode || '').trim() || (p.name || '').trim();
    const idx = store.products.findIndex(
      (x) => x.storeId === sid && ((x.barcode || '').trim() || (x.name || '').trim()) === key
    );
    const entry = { ...p, storeId: sid };
    if (idx >= 0) {
      store.products[idx] = entry;
    } else {
      store.products.push(entry);
    }
  }
}

// Helper: upsert transactions by (storeId, date) - same tx from 2 devices = 1 record
function upsertTransactions(list) {
  for (const t of list) {
    const sid = t.storeId || '';
    const date = t.date || '';
    const idx = store.transactions.findIndex((x) => x.storeId === sid && x.date === date);
    const entry = { ...t, storeId: sid };
    if (idx >= 0) {
      store.transactions[idx] = entry;
    } else {
      store.transactions.push(entry);
    }
  }
}

// Helper: upsert cashCount by (storeId, date)
function upsertCashCounts(list) {
  for (const c of list) {
    const sid = c.storeId || '';
    const date = c.date || '';
    const idx = store.cashCounts.findIndex((x) => x.storeId === sid && x.date === date);
    const entry = { ...c, storeId: sid };
    if (idx >= 0) {
      store.cashCounts[idx] = entry;
    } else {
      store.cashCounts.push(entry);
    }
  }
}

// SYNC (POST) - upsert, no duplicates
app.post('/api/sync-transactions', checkApiKey, (req, res) => {
  const list = req.body.transactions || [];
  upsertTransactions(list);
  console.log('Synced transactions:', list.length);
  res.json({ success: true, synced: list.length });
});

app.post('/api/sync-products', checkApiKey, (req, res) => {
  const list = req.body.products || [];
  upsertProducts(list);
  console.log('Synced products:', list.length);
  res.json({ success: true, synced: list.length });
});

app.post('/api/sync-cashcount', checkApiKey, (req, res) => {
  const list = req.body.cashCounts || [];
  upsertCashCounts(list);
  console.log('Synced cashCount:', list.length);
  res.json({ success: true, synced: list.length });
});

// RESTORE (GET) - return deduplicated data
function dedupeProducts(arr) {
  const seen = new Set();
  return arr.filter((p) => {
    const key = ((p.barcode || '').trim() || (p.name || '').trim()) + '|' + (p.storeId || '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeByDate(arr) {
  const byKey = {};
  for (const x of arr) {
    const k = (x.storeId || '') + '|' + (x.date || '');
    byKey[k] = x; // keep latest
  }
  return Object.values(byKey);
}

app.get('/api/restore-products', checkApiKey, (req, res) => {
  const storeId = req.query.storeId || '';
  let arr = storeId ? store.products.filter((p) => p.storeId === storeId) : store.products;
  arr = dedupeProducts(arr);
  console.log('Restore products:', arr.length, 'storeId:', storeId);
  res.json({ products: arr });
});

app.get('/api/restore-transactions', checkApiKey, (req, res) => {
  const storeId = req.query.storeId || '';
  let arr = storeId ? store.transactions.filter((t) => t.storeId === storeId) : store.transactions;
  arr = dedupeByDate(arr);
  arr.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  console.log('Restore transactions:', arr.length, 'storeId:', storeId);
  res.json({ transactions: arr });
});

app.get('/api/restore-cashcount', checkApiKey, (req, res) => {
  const storeId = req.query.storeId || '';
  let arr = storeId ? store.cashCounts.filter((c) => c.storeId === storeId) : store.cashCounts;
  arr = dedupeByDate(arr);
  arr.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  console.log('Restore cashCount:', arr.length, 'storeId:', storeId);
  res.json({ cashCounts: arr });
});

app.get('/api/health', (_, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('POS Backup server on port', port));
