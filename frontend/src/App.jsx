import React, { useState, useEffect } from 'react';
import ExchangeSelector from './components/ExchangeSelector';
import OffsetInputs from './components/OffsetInputs';
import OrderBookCharts from './components/OrderBookCharts';
import OrderBookTable from './components/OrderBookTable';
import BuySellPanel from './components/BuySellPanel';
import HoldingsTable from './components/HoldingsTable';
import TradebookModal from './components/TradebookModal';

function SymbolSelector({ symbols, value, onChange, activeSymbols = [] }) {
  return (
    <div>
      <label style={{ fontWeight: 600 }}>Symbol </label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ padding: 4, minWidth: 120 }}>
        {symbols.map(s => (
          <option key={s} value={s}>
            {activeSymbols.includes(s) ? '● ' : ''}{s}
          </option>
        ))}
      </select>
    </div>
  );
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

// Define a static list of top exchanges (by popularity, reliability, and public order book support)
const TOP_EXCHANGES = [
  'binance', 'coinbase', 'kraken', 'bybit', 'bitfinex', 'kucoin', 'okx', 'bitstamp', 'gateio', 'mexc',
  'bitget', 'bitmart', 'bitflyer', 'bittrex', 'poloniex', 'gemini', 'phemex', 'bitvavo', 'ascendex', 'lbank',
];

const FAMOUS_SYMBOLS = {
  binance: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT', 'ADA/USDT', 'MATIC/USDT', 'LTC/USDT', 'TRX/USDT'],
  coinbase: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'LTC/USD', 'ADA/USD', 'AVAX/USD', 'DOGE/USD', 'MATIC/USD', 'SHIB/USD', 'BCH/USD'],
  kraken: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'LTC/USD', 'ADA/USD', 'XRP/USD', 'DOGE/USD', 'DOT/USD', 'BCH/USD', 'LINK/USD'],
  bybit: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT', 'ADA/USDT', 'BNB/USDT', 'MATIC/USDT', 'LTC/USDT', 'TRX/USDT'],
  bitfinex: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'LTC/USD', 'XRP/USD', 'DOGE/USD', 'ADA/USD', 'BCH/USD', 'EOS/USD', 'LINK/USD'],
  kucoin: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'LTC/USDT', 'XRP/USDT', 'ADA/USDT', 'DOGE/USDT', 'BNB/USDT', 'MATIC/USDT', 'TRX/USDT'],
  okx: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'LTC/USDT', 'XRP/USDT', 'DOGE/USDT', 'ADA/USDT', 'BNB/USDT', 'MATIC/USDT', 'TRX/USDT'],
  bitstamp: ['BTC/USD', 'ETH/USD', 'XRP/USD', 'LTC/USD', 'BCH/USD', 'ADA/USD', 'LINK/USD', 'DOGE/USD', 'SOL/USD', 'MATIC/USD'],
  gateio: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'LTC/USDT', 'XRP/USDT', 'ADA/USDT', 'DOGE/USDT', 'BNB/USDT', 'MATIC/USDT', 'TRX/USDT'],
  mexc: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'LTC/USDT', 'XRP/USDT', 'ADA/USDT', 'DOGE/USDT', 'BNB/USDT', 'MATIC/USDT', 'TRX/USDT'],
  bitget: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'LTC/USDT', 'XRP/USDT', 'ADA/USDT', 'DOGE/USDT', 'BNB/USDT', 'MATIC/USDT', 'TRX/USDT'],
  bitmart: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'LTC/USDT', 'XRP/USDT', 'ADA/USDT', 'DOGE/USDT', 'BNB/USDT', 'MATIC/USDT', 'TRX/USDT'],
  bitflyer: ['BTC/JPY', 'ETH/JPY', 'BCH/JPY', 'LTC/JPY', 'XRP/JPY', 'MONA/JPY', 'ETH/BTC', 'BCH/BTC', 'LTC/BTC', 'XRP/BTC'],
  bittrex: ['BTC/USD', 'ETH/USD', 'USDT/USD', 'ADA/USD', 'DOGE/USD', 'LTC/USD', 'XRP/USD', 'BCH/USD', 'LINK/USD', 'SOL/USD'],
  poloniex: ['BTC/USDT', 'ETH/USDT', 'TRX/USDT', 'XRP/USDT', 'LTC/USDT', 'BCH/USDT', 'DOGE/USDT', 'ADA/USDT', 'MATIC/USDT', 'SOL/USDT'],
  gemini: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'LTC/USD', 'BCH/USD', 'LINK/USD', 'DOGE/USD', 'MATIC/USD', 'AAVE/USD', 'UNI/USD'],
  phemex: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'LTC/USDT', 'XRP/USDT', 'ADA/USDT', 'DOGE/USDT', 'BNB/USDT', 'MATIC/USDT', 'TRX/USDT'],
  bitvavo: ['BTC/EUR', 'ETH/EUR', 'ADA/EUR', 'XRP/EUR', 'LTC/EUR', 'DOGE/EUR', 'BCH/EUR', 'SOL/EUR', 'DOT/EUR', 'LINK/EUR'],
  ascendex: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'LTC/USDT', 'XRP/USDT', 'ADA/USDT', 'DOGE/USDT', 'BNB/USDT', 'MATIC/USDT', 'TRX/USDT'],
  lbank: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'LTC/USDT', 'XRP/USDT', 'ADA/USDT', 'DOGE/USDT', 'BNB/USDT', 'MATIC/USDT', 'TRX/USDT'],
};

function getSortedSymbols(symbols, exchange) {
  const famous = FAMOUS_SYMBOLS[exchange] || [];
  const famousSet = new Set(famous);
  const famousSymbols = famous.filter(s => symbols.includes(s));
  const rest = symbols.filter(s => !famousSet.has(s));
  return [...famousSymbols, ...rest];
}

export default function App() {
  const [exchanges, setExchanges] = useState([]);
  const [exchange, setExchange] = useState('');
  const [supportedExchanges, setSupportedExchanges] = useState([]);
  const [symbols, setSymbols] = useState([]);
  const [activeSymbols, setActiveSymbols] = useState([]);
  const [symbol, setSymbol] = useState('');
  const [qtOffset, setQtOffset] = useState(0);
  const [amtOffset, setAmtOffset] = useState(0);
  const [orderbook, setOrderbook] = useState({ bids: [], asks: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotIdx, setSnapshotIdx] = useState(0);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
      return 'light';
    }
    return 'light';
  });
  const [continuous, setContinuous] = useState(false);
  const pollingRef = React.useRef(null);
  const [ticker, setTicker] = useState(null);

  const [holdings, setHoldings] = useState([]);
  const [trades, setTrades] = useState([]);
  const [tradebookOpen, setTradebookOpen] = useState(false);
  const [balance, setBalance] = useState(0);

  // Fetch holdings and trades from backend
  async function fetchHoldings() {
    try {
      const res = await fetch('http://localhost:3001/api/holdings');
      const data = await res.json();
      if (!res.ok) {
        console.error('Error fetching holdings:', data.error);
        setHoldings([]);
        return;
      }
      // Defensive: only valid holdings
      const validHoldings = Array.isArray(data)
        ? data.filter(h => h && typeof h.asset === 'string' && typeof h.quantity === 'number' && h.quantity > 0.000001)
        : [];
      setHoldings(validHoldings);
    } catch (err) {
      console.error('Network error:', err);
      setHoldings([]);
    }
  }
  async function fetchTrades() {
    const res = await fetch('http://localhost:3001/api/trades');
    const data = await res.json();
    setTrades(data);
  }
  async function fetchBalance() {
    const res = await fetch('http://localhost:3001/api/balance');
    const data = await res.json();
    setBalance(data.balance);
  }
  useEffect(() => { fetchHoldings(); fetchTrades(); fetchBalance(); }, []);

  // Persist holdings and tradebook
  useEffect(() => {
    // localStorage.setItem('holdings', JSON.stringify(holdings)); // No longer needed
  }, [holdings]);
  useEffect(() => {
    // localStorage.setItem('tradebook', JSON.stringify(tradebook)); // No longer needed
  }, [trades]); // Changed from tradebook to trades

  // Buy/Sell logic
  async function handleOrder({ side, orderType, price, amount }) {
    try {
      setError('');
      const res = await fetch('http://localhost:3001/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side, orderType, symbol, price, amount })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Order failed');
      }
      // Always fetch the fresh state from the backend after a trade
      await Promise.all([fetchHoldings(), fetchTrades(), fetchBalance()]);
    } catch (e) {
      setError('Order failed: ' + e.message);
    }
  };

  // Reset portfolio
  async function handleReset() {
    await fetch('http://localhost:3001/api/holdings/reset', { method: 'POST' });
    await fetch('http://localhost:3001/api/balance/reset', { method: 'POST' });
    await fetchHoldings();
    await fetchBalance();
  }
  // Clear trades
  async function handleClearTrades() {
    await fetch('http://localhost:3001/api/trades/clear', { method: 'POST' });
    await fetchTrades();
  }

  const handleSellFromPortfolio = (asset, amount) => {
    if (!symbol || !ticker?.last) return;
    const base = symbol.split('/')[0];
    const quote = symbol.split('/')[1];
    if (asset !== base) return; // Only allow selling base asset
    const price = ticker.last;
    let newHoldings = [...holdings];
    const baseObj = newHoldings.find(h => h.asset === base);
    const quoteObj = newHoldings.find(h => h.asset === quote);
    if (!baseObj || !quoteObj) return;
    const prevQty = parseFloat(baseObj.quantity || 0);
    const prevAvg = parseFloat(baseObj.avgBuyPrice || 0);
    const realizedPnL = (price - prevAvg) * amount;
    baseObj.quantity = (prevQty - amount).toFixed(6);
    quoteObj.quantity = (parseFloat(quoteObj.quantity) + amount * price).toFixed(2);
    if (parseFloat(baseObj.quantity) <= 0) baseObj.avgBuyPrice = '0.00';
    // Update backend
    fetch('http://localhost:3001/api/holdings/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ holdings: newHoldings })
    });
    fetch('http://localhost:3001/api/trades/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        side: 'sell',
        asset: base,
        price,
        amount,
        realizedPnL
      })
    });
    fetchHoldings();
    fetchTrades();
    fetchBalance();
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    async function fetchExchanges() {
      try {
        const res = await fetch('http://localhost:3001/api/exchanges');
        const ids = await res.json();
        // Only keep top exchanges
        const filtered = ids.filter(ex => TOP_EXCHANGES.includes(ex));
        // Only keep exchanges that return valid symbols
        const checks = await Promise.all(filtered.map(async (ex) => {
          try {
            const res = await fetch(`http://localhost:3001/api/symbols?exchange=${ex}`);
            if (!res.ok) return null;
            const syms = await res.json();
            return (Array.isArray(syms) && syms.length > 0) ? { ex, syms } : null;
          } catch {
            return null;
          }
        }));
        const valid = checks.filter(Boolean);
        setSupportedExchanges(valid.map(v => v.ex));
        setExchanges(valid.map(v => v.ex));
        // Default to binance if available, else first valid
        if (valid.some(v => v.ex === 'binance')) setExchange('binance');
        else if (valid.length > 0) setExchange(valid[0].ex);
      } catch (e) {
        setError('Failed to load exchanges');
      }
    }
    fetchExchanges();
  }, []);

  useEffect(() => {
    if (!exchange) return;
    async function fetchSymbols() {
      setSymbols([]);
      setSymbol('');
      setActiveSymbols([]);
      try {
        const res = await fetch(`http://localhost:3001/api/symbols?exchange=${exchange}`);
        let syms = await res.json();
        syms = syms.filter(s => /\/USDT$|\/USD$|\/BTC$/.test(s));
        setSymbols(syms);
        // Check which symbols have an active order book (limit 20)
        const checks = await Promise.all(syms.slice(0, 20).map(async (sym) => {
          try {
            const res = await fetch(`http://localhost:3001/api/orderbook?exchange=${exchange}&symbol=${encodeURIComponent(sym)}`);
            if (!res.ok) return null;
            const data = await res.json();
            return (Array.isArray(data.bids) && data.bids.length > 0 && Array.isArray(data.asks) && data.asks.length > 0) ? sym : null;
          } catch {
            return null;
          }
        }));
        const active = checks.filter(Boolean);
        setActiveSymbols(active);
        // Default to BTC/USDT if available and active, else first active, else first
        if (active.includes('BTC/USDT')) setSymbol('BTC/USDT');
        else if (active.length > 0) setSymbol(active[0]);
        else if (syms.length > 0) setSymbol(syms[0]);
      } catch (e) {
        setError('This exchange does not support public symbols or requires authentication. Please select another exchange.');
      }
    }
    fetchSymbols();
  }, [exchange]);

  const fetchSnapshots = async (ex, sym) => {
    if (!ex || !sym) return;
    try {
      const res = await fetch(`http://localhost:3001/api/snapshots?exchange=${ex}&symbol=${encodeURIComponent(sym)}`);
      const data = await res.json();
      setSnapshots(data);
      setSnapshotIdx(data.length - 1); // default to latest
    } catch {
      setSnapshots([]);
      setSnapshotIdx(0);
    }
  };

  const fetchOrderbook = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:3001/api/orderbook?exchange=${exchange}&symbol=${encodeURIComponent(symbol)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if ((!data.bids || data.bids.length === 0) && (!data.asks || data.asks.length === 0)) {
        setError('No order book data available for this symbol. Please try another.');
        setOrderbook({ bids: [], asks: [] });
        setSnapshots([]);
        setLoading(false);
        return;
      }
      setOrderbook(data);
      await fetchSnapshots(exchange, symbol);
    } catch (e) {
      setError(e.message);
      setOrderbook({ bids: [], asks: [] });
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  };

  // When user changes snapshotIdx, update orderbook view
  useEffect(() => {
    if (snapshots.length && snapshotIdx >= 0 && snapshotIdx < snapshots.length) {
      setOrderbook({ bids: snapshots[snapshotIdx].bids, asks: snapshots[snapshotIdx].asks });
    }
  }, [snapshotIdx, snapshots]);

  useEffect(() => {
    if (continuous) {
      fetchOrderbook();
      pollingRef.current = setInterval(fetchOrderbook, 2000);
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [continuous, exchange, symbol]);

  useEffect(() => {
    if (!exchange || !symbol) return setTicker(null);
    let ignore = false;
    fetch(`http://localhost:3001/api/ticker?exchange=${exchange}&symbol=${encodeURIComponent(symbol)}`)
      .then(res => res.json())
      .then(data => {
        if (!ignore) setTicker(data && !data.error ? data : null);
      })
      .catch(() => { if (!ignore) setTicker(null); });
    return () => { ignore = true; };
  }, [exchange, symbol]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div className="main-card" style={{ width: '90vw', margin: '40px auto', fontFamily: 'sans-serif', border: '1px solid var(--color-border)', padding: 24, background: 'var(--color-card)', borderRadius: 8, boxShadow: '0 2px 12px #0001', overflow: 'hidden', position: 'relative' }}>
        <button
          aria-label="Toggle light/dark mode"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{ position: 'absolute', top: 18, right: 18, zIndex: 2, background: 'var(--color-btn-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '4px 14px', fontWeight: 600, fontSize: 16, boxShadow: '0 1px 4px #0001', cursor: 'pointer' }}
        >
          {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <h2 style={{ textAlign: 'center', marginBottom: 8 }}>DeltaFrame</h2>
        <div style={{ textAlign: 'center', marginBottom: 20, color: '#888', fontSize: 15 }}>
          <span>This is a learning and experimental project, not a production trading tool.</span>
        </div>
        <div className="controls-row" style={{ display: 'flex', gap: 16, marginBottom: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          <ExchangeSelector exchanges={exchanges} value={exchange} onChange={setExchange} supportedExchanges={supportedExchanges} />
          <SymbolSelector
            symbols={getSortedSymbols(symbols, exchange)}
            value={symbol}
            onChange={setSymbol}
            activeSymbols={activeSymbols}
          />
          <OffsetInputs qtOffset={qtOffset} setQtOffset={setQtOffset} amtOffset={amtOffset} setAmtOffset={setAmtOffset} />
          <button
            onClick={() => {
              if (continuous) setContinuous(false);
              else setContinuous(true);
            }}
            style={{ padding: '0 18px', fontWeight: 600, height: 32 }}
            disabled={!symbol}
          >
            {continuous ? 'Stop' : 'Fetch'}
          </button>
          {continuous && <span style={{ alignSelf: 'center', color: 'var(--color-accent)', fontWeight: 600, fontSize: 15 }}>Continuous</span>}
        </div>
        {/* Market Info Panel as Continuous Marquee */}
        {ticker && (
          <div style={{
            width: '100%',
            overflow: 'hidden',
            marginBottom: 18,
            borderRadius: 8,
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            fontSize: 15,
            color: 'var(--color-text)',
            boxShadow: '0 1px 6px #0001',
            padding: 0,
            height: 38,
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
          }}>
            <div style={{
              display: 'flex',
              whiteSpace: 'nowrap',
              width: 'max-content',
              animation: 'marquee 18s linear infinite',
            }}>
              {/* Marquee content duplicated for seamless loop */}
              {[0,1].map(i => (
                <div key={i} style={{ display: 'flex' }}>
                  <span style={{ marginRight: 32 }}><b>Last:</b> {ticker.last ?? '—'}</span>
                  <span style={{ marginRight: 32 }}><b>24h High:</b> {ticker.high ?? '—'}</span>
                  <span style={{ marginRight: 32 }}><b>24h Low:</b> {ticker.low ?? '—'}</span>
                  <span style={{ marginRight: 32 }}><b>24h Vol:</b> {ticker.baseVolume ?? ticker.quoteVolume ?? '—'}</span>
                  <span style={{ marginRight: 32 }}><b>Change:</b> {ticker.change ? `${ticker.change} (${ticker.percentage ?? ''}%)` : '—'}</span>
                  <span style={{ marginRight: 32 }}><b>Bid:</b> {ticker.bid ?? '—'}</span>
                  <span style={{ marginRight: 32 }}><b>Ask:</b> {ticker.ask ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <div className="main-flex" style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
            <div className="orderbook-table" style={{ flex: 1 }}>
              <div style={{ maxHeight: 412, minHeight: 220, overflowY: 'auto' }}>
                <OrderBookTable bids={orderbook.bids} asks={orderbook.asks} />
              </div>
              <HoldingsTable
                holdings={holdings}
                currentPrice={ticker?.last}
                symbol={symbol}
                onSell={handleSellFromPortfolio}
                balance={balance}
              />
            </div>
            <div className="orderbook-charts" style={{ flex: 1 }}>
              {exchange && symbol && (
                <OrderBookCharts exchange={exchange} symbol={symbol} continuous={continuous} />
              )}
              <BuySellPanel
                symbol={symbol}
                currentPrice={ticker?.last}
                holdings={holdings}
                onOrder={handleOrder}
                balance={balance}
              />
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <button onClick={() => setTradebookOpen(true)} style={{ padding: '8px 22px', fontWeight: 600, borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-btn-bg)', color: 'var(--color-text)', fontSize: 16, marginRight: 12 }}>Tradebook</button>
          <button onClick={handleReset} style={{ padding: '8px 22px', fontWeight: 600, borderRadius: 6, border: '1px solid #e74c3c', background: '#fff', color: '#e74c3c', fontSize: 16 }}>Reset Portfolio</button>
        </div>
        <TradebookModal
          open={tradebookOpen}
          onClose={() => setTradebookOpen(false)}
          tradebook={trades}
          symbol={symbol}
        />
        {snapshots.length > 1 && (
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <input
              type="range"
              min={0}
              max={snapshots.length - 1}
              value={snapshotIdx}
              onChange={e => setSnapshotIdx(Number(e.target.value))}
              style={{ width: 400 }}
            />
            <div style={{ marginTop: 8, fontSize: 14, color: '#555' }}>
              Snapshot: {snapshotIdx + 1} / {snapshots.length} &nbsp;|
              &nbsp;{formatTime(snapshots[snapshotIdx]?.timestamp)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
