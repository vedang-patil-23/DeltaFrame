import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

function LogModal({ open, onClose, logs, asset }) {
  if (!open) return null;
  const lastDesync = logs.length > 0 ? logs[logs.length - 1] : null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--color-card)', borderRadius: 10, padding: 24, minWidth: 340, maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 4px 32px #0003', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>&times;</button>
        <h3 style={{ marginBottom: 12 }}>Desync Log for {asset}</h3>
        {logs.length === 0 ? <div style={{ color: '#888' }}>No desyncs recorded.</div> : (
          <>
            {lastDesync && (
              <div style={{ color: '#e67e22', fontSize: 13, marginBottom: 8 }}>
                Last backend P&L sync: {lastDesync.time} (out of sync)
              </div>
            )}
            <table style={{ width: '100%', fontSize: 13 }}>
              <thead><tr><th>Time</th><th>Local</th><th>Backend</th><th>Price</th></tr></thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={i}>
                    <td>{log.time}</td>
                    <td>{log.local}</td>
                    <td>{log.backend}</td>
                    <td>{log.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

export default function HoldingsTable({ holdings, currentPrice, symbol, onSell, balance, onTradebook, onReset }) {
  // All hooks must be called unconditionally at the top
  const [sellAsset, setSellAsset] = useState(null);
  const [sellAmount, setSellAmount] = useState('');
  const [backendPnL, setBackendPnL] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [desync, setDesync] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncTimer = useRef(null);
  const [nextSyncIn, setNextSyncIn] = useState(45);
  const currentPriceRef = useRef(currentPrice);
  useEffect(() => { currentPriceRef.current = currentPrice; }, [currentPrice]);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logAsset, setLogAsset] = useState('');
  const [desyncLogs, setDesyncLogs] = useState({}); // { asset: [ { time, local, backend, price } ] }

  // All variable declarations must also be unconditional
  const normalizedHoldings = (holdings || []).map(h => ({
    asset: h.asset || '',
    quantity: h.quantity !== undefined ? parseFloat(h.quantity) : 0,
    avgBuyPrice: h.avgBuyPrice !== undefined ? parseFloat(h.avgBuyPrice) : 0,
    active: h.active === undefined ? '1' : h.active
  }));
  const base = symbol ? symbol.split('/')[0] : '';
  const quote = symbol ? symbol.split('/')[1] : '';
  const baseHolding = normalizedHoldings.find(h => h.asset === base) || { quantity: 0, avgBuyPrice: 0 };
  const quoteHolding = normalizedHoldings.find(h => h.asset === quote) || { quantity: 0, avgBuyPrice: 0 };
  const unrealizedPnL = baseHolding.quantity > 0 ? (currentPrice - baseHolding.avgBuyPrice) * baseHolding.quantity : 0;
  const unrealizedPnLPercent = baseHolding.quantity > 0 && baseHolding.avgBuyPrice > 0 ? ((currentPrice - baseHolding.avgBuyPrice) / baseHolding.avgBuyPrice) * 100 : 0;
  const hasHoldings = normalizedHoldings && normalizedHoldings.length > 0 && normalizedHoldings.some(h => h.active === '1');
  let portfolioValue = 0;
  normalizedHoldings.filter(h => h.active === '1').forEach(h => {
    if (h.asset === 'USDT') {
      portfolioValue += h.quantity;
    } else {
      portfolioValue += h.quantity * (currentPrice || 0);
    }
  });
  const totalValue = portfolioValue + balance;

  // Stable backend PnL fetcher
  const fetchBackendPnL = () => {
    if (!symbol || !currentPriceRef.current) return;
    setSyncing(true);
    fetch(`http://localhost:3001/api/unrealized-pnl?symbol=${encodeURIComponent(symbol)}&price=${encodeURIComponent(currentPriceRef.current)}`)
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.unrealizedPnL === 'number') {
          setBackendPnL(data.unrealizedPnL);
          setLastSync(new Date());
          const diff = Math.abs(data.unrealizedPnL - unrealizedPnL);
          if (diff > 0.01) {
            setDesync(true);
            setDesyncLogs(prev => {
              const assetLogs = prev[base] || [];
              return {
                ...prev,
                [base]: [...assetLogs, { time: new Date().toLocaleTimeString(), local: unrealizedPnL, backend: data.unrealizedPnL, price: currentPriceRef.current }]
              };
            });
          } else {
            setDesync(false);
          }
        } else {
          setBackendPnL(null);
          setDesync(false);
        }
      })
      .catch(() => {
        setBackendPnL(null);
        setDesync(false);
      })
      .finally(() => setSyncing(false));
  };

  // Periodic sync every 45 seconds, only when symbol changes
  useEffect(() => {
    fetchBackendPnL();
    setNextSyncIn(45);
    if (syncTimer.current) clearInterval(syncTimer.current);
    const syncInterval = setInterval(() => {
      fetchBackendPnL();
      setNextSyncIn(45);
    }, 45000);
    syncTimer.current = syncInterval;
    const countdown = setInterval(() => {
      setNextSyncIn(prev => prev > 1 ? prev - 1 : 45);
    }, 1000);
    return () => {
      if (syncTimer.current) clearInterval(syncTimer.current);
      clearInterval(countdown);
    };
  }, [symbol]);

  // Manual sync
  const handleManualSync = () => {
    fetchBackendPnL();
    setNextSyncIn(45);
  };

  const handleSell = (asset) => {
    setSellAsset(asset);
    setSellAmount('');
  };
  const handleSellSubmit = (asset, maxQty) => {
    const amt = parseFloat(sellAmount);
    if (!amt || amt <= 0 || amt > maxQty) return;
    onSell && onSell(asset, amt);
    setSellAsset(null);
    setSellAmount('');
  };

  // Only after all hooks and variables, check symbol
  if (!symbol) return null;

  return (
    <div style={{ margin: '32px auto', maxWidth: 500, background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 18 }}>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: '#222', textAlign: 'left', display: 'flex', gap: 12, alignItems: 'center' }}>
        <span>Portfolio: <span style={{ color: portfolioValue >= 100000 ? '#2ecc40' : '#ff4136', fontWeight: 700 }}>${portfolioValue.toFixed(2)}</span></span>
        <span style={{ color: '#bbb', fontWeight: 400, fontSize: 18 }}>|</span>
        <span>Available: <span style={{ color: balance > 0 ? '#2ecc40' : '#ff4136', fontWeight: 700 }}>${balance.toFixed(2)}</span></span>
        <span style={{ color: '#bbb', fontWeight: 400, fontSize: 18 }}>|</span>
        <span>Total: <span style={{ color: totalValue >= 100000 ? '#2ecc40' : '#ff4136', fontWeight: 700 }}>${totalValue.toFixed(2)}</span></span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button onClick={onTradebook} style={{ padding: '4px 12px', fontSize: 13, borderRadius: 5, border: '1px solid var(--color-border)', background: 'var(--color-btn-bg)', color: 'var(--color-text)', fontWeight: 600, flex: 1 }}>Tradebook</button>
        <button onClick={onReset} style={{ padding: '4px 12px', fontSize: 13, borderRadius: 5, border: '1px solid #e74c3c', background: '#fff', color: '#e74c3c', fontWeight: 600, flex: 1 }}>Reset Portfolio</button>
      </div>
      <h4 style={{ marginBottom: 12 }}>Your Holdings</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <th style={{ textAlign: 'left', padding: 6 }}>Asset</th>
            <th style={{ textAlign: 'right', padding: 6 }}>Quantity</th>
            <th style={{ textAlign: 'right', padding: 6 }}>Avg. Buy Price</th>
            <th style={{ textAlign: 'right', padding: 6 }}>Current Price</th>
            <th style={{ textAlign: 'right', padding: 6 }}>Unrealized P&L</th>
            <th style={{ textAlign: 'center', padding: 6 }}></th>
            <th style={{ textAlign: 'center', padding: 6 }}></th>
          </tr>
        </thead>
        <tbody>
          {hasHoldings ? (
            normalizedHoldings.filter(h => h.active === '1').map(holding => {
              const asset = holding.asset || '—';
              const price = (asset === 'USDT') ? 1 : (currentPrice || 0);
              const avg = holding.avgBuyPrice !== undefined ? holding.avgBuyPrice : 0;
              const qty = holding.quantity !== undefined ? holding.quantity : 0;
              // Always show backend value
              const unrealized = asset !== 'USDT' ? (asset === base ? backendPnL : 0) : null;
              const unrealizedPct = asset !== 'USDT' && qty > 0 && avg > 0 && asset === base && backendPnL !== null ? ((price - avg) / avg) * 100 : null;
              return (
                <tr key={asset}>
                  <td style={{ padding: 6 }}>{asset}</td>
                  <td style={{ textAlign: 'right', padding: 6 }}>{qty !== undefined ? qty.toFixed(asset === 'USDT' ? 2 : 6) : '—'}</td>
                  <td style={{ textAlign: 'right', padding: 6 }}>{avg !== undefined ? avg.toFixed(2) : '—'}</td>
                  <td style={{ textAlign: 'right', padding: 6 }}>{price !== undefined ? price.toFixed(2) : '—'}</td>
                  <td style={{ textAlign: 'right', padding: 6, color: unrealized >= 0 ? '#2ecc40' : '#ff4136' }}>{unrealized !== null ? `${unrealized.toFixed(2)} USDT${unrealizedPct !== null ? ` (${unrealizedPct.toFixed(2)}%)` : ''}` : '—'}</td>
                  <td style={{ textAlign: 'center', padding: 6 }}>
                    {asset !== 'USDT' && qty > 0 && (
                      <button style={{ padding: '2px 10px', fontSize: 14, borderRadius: 5, border: '1px solid #ff4136', background: '#fff', color: '#ff4136', fontWeight: 600 }} onClick={() => onSell(asset, qty)}>Sell All</button>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', padding: 6 }}>
                    {asset !== 'USDT' && (
                      <button style={{ padding: '2px 8px', fontSize: 12, borderRadius: 4, border: '1px solid #888', background: '#f8f8f8', color: '#888', fontWeight: 600 }} onClick={() => { setLogAsset(asset); setLogModalOpen(true); }}>Log</button>
                    )}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', color: '#888', padding: 24, fontSize: 16 }}>
                No holdings. Use the Buy panel to purchase crypto.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {lastSync && (
        <div style={{ marginTop: 8, color: '#888', fontSize: 13 }}>
          Last backend P&L sync: {lastSync.toLocaleTimeString()} {desync ? '' : '(in sync)'}
        </div>
      )}
      <div style={{ marginTop: 2, color: '#aaa', fontSize: 11, textAlign: 'right' }}>
        Next backend P&L update in: {nextSyncIn}s
      </div>
      <LogModal open={logModalOpen} onClose={() => setLogModalOpen(false)} logs={desyncLogs[logAsset] || []} asset={logAsset} />
    </div>
  );
}

HoldingsTable.propTypes = {
  holdings: PropTypes.arrayOf(PropTypes.shape({
    asset: PropTypes.string,
    quantity: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    avgBuyPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    active: PropTypes.string
  })),
  currentPrice: PropTypes.number,
  symbol: PropTypes.string,
  onSell: PropTypes.func,
  balance: PropTypes.number,
  onTradebook: PropTypes.func,
  onReset: PropTypes.func
}; 