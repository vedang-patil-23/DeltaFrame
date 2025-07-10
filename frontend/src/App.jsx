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

  useEffect(() => {
    async function fetchExchanges() {
      try {
        const res = await fetch('http://localhost:3001/api/exchanges');
        const ids = await res.json();
        // Check which exchanges support symbols (first 15 for speed)
        const checks = await Promise.all(ids.slice(0, 15).map(async (ex) => {
          try {
            const res = await fetch(`http://localhost:3001/api/symbols?exchange=${ex}`);
            if (!res.ok) return null;
            const syms = await res.json();
            return (Array.isArray(syms) && syms.length > 0) ? ex : null;
          } catch {
            return null;
          }
        }));
        const supported = checks.filter(Boolean);
        setSupportedExchanges(supported);
        // Default to first supported exchange
        if (supported.length > 0) setExchange(supported[0]);
        else if (ids.length > 0) setExchange(ids[0]);
        setExchanges(ids);
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
        // Filter to USDT/USD/BTC pairs for performance
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafbfc' }}>
      <div style={{ minWidth: 900, maxWidth: 1200, width: '90vw', margin: '40px auto', fontFamily: 'sans-serif', border: '1px solid #ccc', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px #0001', overflow: 'hidden' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 8 }}>Orderbook Explorer</h2>
        <div style={{ textAlign: 'center', marginBottom: 20, color: '#888', fontSize: 15 }}>
          <span>This is a learning and experimental project, not a production trading tool.</span>
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          <ExchangeSelector exchanges={exchanges} value={exchange} onChange={setExchange} supportedExchanges={supportedExchanges} />
          <SymbolSelector symbols={symbols} value={symbol} onChange={setSymbol} activeSymbols={activeSymbols} />
          <OffsetInputs qtOffset={qtOffset} setQtOffset={setQtOffset} amtOffset={amtOffset} setAmtOffset={setAmtOffset} />
          <button onClick={fetchOrderbook} style={{ padding: '0 18px', fontWeight: 600, height: 32 }} disabled={!symbol}>Fetch</button>
        </div>
        {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', minWidth: 800 }}>
            <div style={{ flex: 1, minWidth: 320 }}>
              <OrderBookTable bids={orderbook.bids} asks={orderbook.asks} />
            </div>
            <div style={{ flex: 1, minWidth: 400 }}>
              <OrderBookCharts orderbook={orderbook} qtOffset={qtOffset} amtOffset={amtOffset} loading={loading} />
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
