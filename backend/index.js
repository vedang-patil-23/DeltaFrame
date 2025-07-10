const express = require('express');
const cors = require('cors');
const ccxt = require('ccxt');

const app = express();
const PORT = 3001;

app.use(cors());

const snapshots = {};

app.get('/api/orderbook', async (req, res) => {
  const { exchange, symbol } = req.query;
  if (!exchange) return res.status(400).json({ error: 'Exchange required' });
  try {
    const ex = new ccxt[exchange]();
    const orderbook = await ex.fetchOrderBook(symbol || 'BTC/USDT', 20);
    if (symbol) {
      const key = `${exchange}_${symbol}`;
      if (!snapshots[key]) snapshots[key] = [];
      snapshots[key].push({
        timestamp: Date.now(),
        bids: orderbook.bids,
        asks: orderbook.asks,
      });
      if (snapshots[key].length > 10) snapshots[key] = snapshots[key].slice(-10);
    }
    res.json({ bids: orderbook.bids, asks: orderbook.asks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/snapshots', (req, res) => {
  const { exchange, symbol } = req.query;
  if (!exchange || !symbol) return res.status(400).json({ error: 'Exchange and symbol required' });
  const key = `${exchange}_${symbol}`;
  res.json(snapshots[key] || []);
});

app.get('/api/exchanges', (req, res) => {
  try {
    const ids = ccxt.exchanges;
    res.json(ids);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/symbols', async (req, res) => {
  const { exchange } = req.query;
  if (!exchange) return res.status(400).json({ error: 'Exchange required' });
  try {
    const ex = new ccxt[exchange]();
    await ex.loadMarkets();
    const symbols = ex.symbols;
    res.json(symbols);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 