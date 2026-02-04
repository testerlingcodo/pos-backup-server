const express = require('express');
const cors = require('cors');  // ← add this
const app = express();

const API_KEY = process.env.API_KEY || '12664365001';

app.use(cors());  // ← add this
app.use(express.json({ limit: '20mb' })); // images can be big

function checkApiKey(req, res, next) {
  const key = req.header('X-API-KEY');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

let store = {
  transactions: [],
  products: [],
  cashCounts: [],
};

// NOTE: For real backup, palitan mo ito ng DATABASE (MySQL/Postgres).
app.post('/api/sync-transactions', checkApiKey, (req, res) => {
  const list = req.body.transactions || [];
  store.transactions.push(...list);
  res.json({ success: true, synced: list.length });
});

app.post('/api/sync-products', checkApiKey, (req, res) => {
  const list = req.body.products || [];
  store.products.push(...list);
  res.json({ success: true, synced: list.length });
});

app.post('/api/sync-cashcount', checkApiKey, (req, res) => {
  const list = req.body.cashCounts || [];
  store.cashCounts.push(...list);
  res.json({ success: true, synced: list.length });
});

app.get('/api/health', (_, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Backup server running on', port));