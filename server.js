// POS Backup Server - Products use REPLACE (deletes stay deleted)
const express = require('express');
const cors = require('cors');
const app = express();

const API_KEY = process.env.API_KEY || '12664365001';

app.use(cors());
app.use(express.json({ limit: '20mb' }));

function checkApiKey(req, res, next) {
  const key = req.header('X-API-KEY');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

let store = { transactions: [], products: [], cashCounts: [] };

function upsertTransactions(list) {
  for (const t of list) {
    const sid = t.storeId || '';
    const date = t.date || '';
    const idx = store.transactions.findIndex((x) => x.storeId === sid && x.date === date);
    if (idx >= 0) store.transactions[idx] = { ...t, storeId: sid };
    else store.transactions.push({ ...t, storeId: sid });
  }
}

function upsertCashCounts(list) {
  for (const c of list) {
    const sid = c.storeId || '';
    const date = c.date || '';
    const idx = store.cashCounts.findIndex((x) => x.storeId === sid && x.date === date);
    if (idx >= 0) store.cashCounts[idx] = { ...c, storeId: sid };
    else store.cashCounts.push({ ...c, storeId: sid });
  }
}

app.post('/api/sync-products', checkApiKey, (req, res) => {
  const list = req.body.products || [];
  const replace = req.body.replace === true;
  const sid = req.body.storeId || (list[0] && list[0].storeId) || '';

  if (replace && sid) {
    store.products = store.products.filter((p) => p.storeId !== sid);
  }
  store.products.push(...list.map((p) => ({ ...p, storeId: p.storeId || sid })));

  res.json({ success: true, synced: list.length });
});

app.post('/api/sync-transactions', checkApiKey, (req, res) => {
  const list = req.body.transactions || [];
  upsertTransactions(list);
  res.json({ success: true, synced: list.length });
});

app.post('/api/sync-cashcount', checkApiKey, (req, res) => {
  const list = req.body.cashCounts || [];
  upsertCashCounts(list);
  res.json({ success: true, synced: list.length });
});

app.get('/api/restore-products', checkApiKey, (req, res) => {
  const storeId = req.query.storeId || '';
  const arr = storeId ? store.products.filter((p) => p.storeId === storeId) : store.products;
  res.json({ products: arr });
});

app.get('/api/restore-transactions', checkApiKey, (req, res) => {
  const storeId = req.query.storeId || '';
  let arr = storeId ? store.transactions.filter((t) => t.storeId === storeId) : store.transactions;
  const byKey = {};
  for (const x of arr) byKey[(x.storeId || '') + '|' + (x.date || '')] = x;
  arr = Object.values(byKey).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  res.json({ transactions: arr });
});

app.get('/api/restore-cashcount', checkApiKey, (req, res) => {
  const storeId = req.query.storeId || '';
  let arr = storeId ? store.cashCounts.filter((c) => c.storeId === storeId) : store.cashCounts;
  const byKey = {};
  for (const x of arr) byKey[(x.storeId || '') + '|' + (x.date || '')] = x;
  arr = Object.values(byKey).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  res.json({ cashCounts: arr });
});

app.get('/api/health', (_, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('POS Backup server on port', port));
