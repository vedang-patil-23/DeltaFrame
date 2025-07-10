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
    if (!ccxt.exchanges.includes(exchange)) {
      return res.status(400).json({ error: 'Exchange not found' });
    }
    const ex = new ccxt[exchange]();
    // Check if the exchange supports fetchMarkets or fetchSymbols
    if (!(ex.has && (ex.has['fetchMarkets'] || ex.has['fetchSymbols']))) {
      return res.status(400).json({ error: 'Exchange does not support public symbols' });
    }
    // Some exchanges require authentication for markets
    if (ex.apiKey || ex.secret || ex.uid) {
      return res.status(400).json({ error: 'Exchange requires authentication' });
    }
    await ex.loadMarkets();
    const symbols = ex.symbols;
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: 'No public symbols available for this exchange' });
    }
    res.json(symbols);
  } catch (err) {
    // If error message indicates authentication or not supported, return 400
    if (err && (err.message.includes('authentication') || err.message.includes('not supported') || err.message.includes('API key'))) {
      return res.status(400).json({ error: 'Exchange does not support public symbols or requires authentication' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ohlcv', async (req, res) => {
  const { exchange, symbol, interval } = req.query;
  if (!exchange || !symbol) return res.status(400).json({ error: 'Exchange and symbol required' });
  try {
    const ex = new ccxt[exchange]();
    if (!ex.has['fetchOHLCV']) return res.status(400).json({ error: 'Exchange does not support OHLCV' });
    await ex.loadMarkets();
    const timeframe = interval || '1m';
    const ohlcv = await ex.fetchOHLCV(symbol, timeframe, undefined, 200);
    // ohlcv: [timestamp, open, high, low, close, volume]
    res.json(ohlcv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 