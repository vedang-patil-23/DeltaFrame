console.log('RUNNING BACKEND FILE:', __filename);
const express = require('express');
const cors = require('cors');
const ccxt = require('ccxt');
const fs = require('fs').promises;
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { HoldingSchema, TradeSchema, BalanceSchema, normalizeHolding, normalizeTrade, normalizeBalance } = require('./schemas');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const snapshots = {};

// --- Sequelize DB Setup ---
const { Sequelize, DataTypes, Op } = require('sequelize');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.sqlite'),
  logging: false,
});
// REMOVE Holdings model
delete sequelize.models.Holding;
const Trade = sequelize.define('Trade', {
  timestamp: { type: DataTypes.STRING, allowNull: false },
  side: { type: DataTypes.STRING, allowNull: false },
  asset: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false },
  amount: { type: DataTypes.FLOAT, allowNull: false },
  realizedPnL: { type: DataTypes.FLOAT, allowNull: false },
  uid: { type: DataTypes.STRING, allowNull: false },
}, { timestamps: false });
const Balance = sequelize.define('Balance', {
  balance: { type: DataTypes.FLOAT, allowNull: false },
}, { timestamps: false });
// --- End Sequelize DB Setup ---

// REMOVE deduplicateHoldings and all related logic

// --- API Endpoints ---

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

// New endpoint for ticker/market info
app.get('/api/ticker', async (req, res) => {
  const { exchange, symbol } = req.query;
  if (!exchange || !symbol) return res.status(400).json({ error: 'Exchange and symbol required' });
  try {
    const ex = new ccxt[exchange]();
    await ex.loadMarkets();
    if (!ex.has['fetchTicker']) return res.status(400).json({ error: 'Exchange does not support ticker/market info' });
    const ticker = await ex.fetchTicker(symbol);
    // Return only relevant fields for frontend market info panel
    res.json({
      symbol: ticker.symbol,
      last: ticker.last,
      high: ticker.high,
      low: ticker.low,
      bid: ticker.bid,
      ask: ticker.ask,
      open: ticker.open,
      close: ticker.close,
      baseVolume: ticker.baseVolume,
      quoteVolume: ticker.quoteVolume,
      percentage: ticker.percentage,
      change: ticker.change,
      previousClose: ticker.previousClose,
      datetime: ticker.datetime,
      info: ticker.info // raw exchange data for debugging/extension
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET holdings (now computed from trades)
app.get('/api/holdings', async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        asset,
        SUM(CASE WHEN side = 'buy' THEN amount ELSE -amount END) AS quantity,
        ROUND(
          SUM(CASE WHEN side = 'buy' THEN amount * price ELSE 0 END) / 
          NULLIF(SUM(CASE WHEN side = 'buy' THEN amount ELSE 0 END), 0),
          2
        ) AS avgBuyPrice
      FROM Trades
      GROUP BY asset
      HAVING quantity > 0.000001
    `);
    res.json(results);
  } catch (err) {
    console.error('Failed to compute holdings:', err);
    res.status(500).json({ error: 'Failed to compute holdings' });
  }
});

// REMOVE /api/holdings/update and /api/holdings/reset endpoints

// GET trades
app.get('/api/trades', async (req, res) => {
  try {
    const trades = await Trade.findAll();
    res.json(trades.map(t => t.toJSON()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add trade
app.post('/api/trades/add', async (req, res) => {
  try {
    let trade = req.body;
    trade.uid = trade.uid || `${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    await Trade.create({
      timestamp: trade.timestamp,
      side: trade.side,
      asset: trade.asset,
      price: parseFloat(trade.price),
      amount: parseFloat(trade.amount),
      realizedPnL: parseFloat(trade.realizedPnL || '0'),
      uid: trade.uid,
    });
    res.json({ success: true, uid: trade.uid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST clear trades
app.post('/api/trades/clear', async (req, res) => {
  try {
    await Trade.destroy({ where: {} });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trades (buy/sell simulation)
app.post('/api/trades', async (req, res) => {
  try {
    const { side, orderType, symbol, price, amount } = req.body;
    if (!side || !['buy', 'sell'].includes(side)) return res.status(400).json({ error: 'Invalid side' });
    if (!symbol || typeof symbol !== 'string') return res.status(400).json({ error: 'Invalid symbol' });
    if (!price || isNaN(price) || price <= 0) return res.status(400).json({ error: 'Invalid price' });
    if (!amount || isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const base = symbol.split('/')[0];
    // Only use Balance for funds check
    let balanceRow = await Balance.findOne();
    let balance = balanceRow ? balanceRow.balance : 100000.00;
    let realizedPnL = 0;
    if (side === 'buy') {
      if (balance < price * amount) return res.status(400).json({ error: 'Insufficient funds' });
      balance -= amount * price;
    } else {
      // Compute current holding for base asset from Trades
      const [results] = await sequelize.query(`
        SELECT 
          SUM(CASE WHEN side = 'buy' THEN amount ELSE -amount END) AS quantity
        FROM Trades
        WHERE asset = ?
      `, { replacements: [base] });
      const currentQty = results[0]?.quantity || 0;
      if (currentQty < amount) return res.status(400).json({ error: 'Insufficient holdings' });
      realizedPnL = 0; // You can compute realizedPnL if needed
      balance += amount * price;
    }
    await Balance.destroy({ where: {} });
    await Balance.create({ balance });
    await Trade.create({
      timestamp: new Date().toISOString(),
      side,
      asset: base,
      price: price,
      amount: amount,
      realizedPnL: realizedPnL,
      uid: `${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET balance
app.get('/api/balance', async (req, res) => {
  try {
    let balanceRow = await Balance.findOne();
    let balance = balanceRow ? balanceRow.balance : 100000.00;
    res.json({ balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST update balance
app.post('/api/balance/update', async (req, res) => {
  try {
    let value = parseFloat(req.body.balance);
    if (isNaN(value)) return res.status(400).json({ error: 'Invalid balance' });
    await Balance.destroy({ where: {} });
    await Balance.create({ balance: value });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST reset balance
app.post('/api/balance/reset', async (req, res) => {
  try {
    await Balance.destroy({ where: {} });
    await Balance.create({ balance: 100000.00 });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 