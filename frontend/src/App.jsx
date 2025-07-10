import React, { useState, useEffect } from 'react';
import ExchangeSelector from './components/ExchangeSelector';
import OffsetInputs from './components/OffsetInputs';
import OrderBookCharts from './components/OrderBookCharts';
import OrderBookTable from './components/OrderBookTable';

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
        <h2 style={{ textAlign: 'center', marginBottom: 8 }}>Orderbook Explorer</h2>
        <div style={{ textAlign: 'center', marginBottom: 20, color: '#888', fontSize: 15 }}>
          <span>This is a learning and experimental project, not a production trading tool.</span>
        </div>
        <div className="controls-row" style={{ display: 'flex', gap: 16, marginBottom: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          <ExchangeSelector exchanges={exchanges} value={exchange} onChange={setExchange} supportedExchanges={supportedExchanges} />
          <SymbolSelector symbols={symbols} value={symbol} onChange={setSymbol} activeSymbols={activeSymbols} />
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
        {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <div className="main-flex" style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
            <div className="orderbook-table" style={{ flex: 1 }}>
              <OrderBookTable bids={orderbook.bids} asks={orderbook.asks} />
            </div>
            <div className="orderbook-charts" style={{ flex: 1 }}>
              {exchange && symbol && (
                <OrderBookCharts exchange={exchange} symbol={symbol} continuous={continuous} />
              )}
            </div>
          </div>
        </div>
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
