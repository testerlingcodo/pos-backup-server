// POS Backup Server - Deploy to Render.com
// npm install express cors && node server.js

const express = require('express');
const cors = require('cors');
const app = express();

const API_KEY = process.env.API_KEY || '12664365001';

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Log all requests (visible in Render logs)
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

// SYNC (POST)
app.post('/api/sync-transactions', checkApiKey, (req, res) => {
  const list = req.body.transactions || [];
  store.transactions.push(...list);
  console.log('Synced transactions:', list.length, 'storeId:', list[0]?.storeId);
  res.json({ success: true, synced: list.length });
});

app.post('/api/sync-products', checkApiKey, (req, res) => {
  const list = req.body.products || [];
  store.products.push(...list);
  console.log('Synced products:', list.length, 'storeId:', list[0]?.storeId);
  res.json({ success: true, synced: list.length });
});

app.post('/api/sync-cashcount', checkApiKey, (req, res) => {
  const list = req.body.cashCounts || [];
  store.cashCounts.push(...list);
  console.log('Synced cashCount:', list.length, 'storeId:', list[0]?.storeId);
  res.json({ success: true, synced: list.length });
});

// RESTORE (GET) - must have these for Restore button to work
app.get('/api/restore-products', checkApiKey, (req, res) => {
  const storeId = req.query.storeId || '';
  const products = storeId ? store.products.filter(p => p.storeId === storeId) : store.products;
  console.log('Restore products:', products.length, 'for storeId:', storeId);
  res.json({ products });
});

app.get('/api/restore-transactions', checkApiKey, (req, res) => {
  const storeId = req.query.storeId || '';
  const transactions = storeId ? store.transactions.filter(t => t.storeId === storeId) : store.transactions;
  console.log('Restore transactions:', transactions.length, 'for storeId:', storeId);
  res.json({ transactions });
});

app.get('/api/restore-cashcount', checkApiKey, (req, res) => {
  const storeId = req.query.storeId || '';
  const cashCounts = storeId ? store.cashCounts.filter(c => c.storeId === storeId) : store.cashCounts;
  console.log('Restore cashCount:', cashCounts.length, 'for storeId:', storeId);
  res.json({ cashCounts });
});

app.get('/api/health', (_, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('POS Backup server on port', port));
