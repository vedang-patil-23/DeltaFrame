import React from 'react';

export default function TradebookModal({ open, onClose, tradebook, symbol }) {
  if (!open) return null;
  const base = symbol ? symbol.split('/')[0] : '';
  const quote = symbol ? symbol.split('/')[1] : '';
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--color-card)', borderRadius: 10, padding: 28, minWidth: 420, maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 4px 32px #0003', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>&times;</button>
        <h3 style={{ marginBottom: 18 }}>Tradebook</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <th style={{ textAlign: 'left', padding: 6 }}>Time</th>
              <th style={{ textAlign: 'center', padding: 6 }}>Side</th>
              <th style={{ textAlign: 'right', padding: 6 }}>Price</th>
              <th style={{ textAlign: 'right', padding: 6 }}>Amount</th>
              <th style={{ textAlign: 'right', padding: 6 }}>Total</th>
              <th style={{ textAlign: 'right', padding: 6 }}>Realized P&L</th>
            </tr>
          </thead>
          <tbody>
            {tradebook.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: 18 }}>No trades yet.</td></tr>
            ) : tradebook.map((t, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: 6 }}>{new Date(t.time).toLocaleString()}</td>
                <td style={{ textAlign: 'center', padding: 6, color: t.side==='buy'?'#2ecc40':'#ff4136', fontWeight: 600 }}>{t.side.charAt(0).toUpperCase() + t.side.slice(1)}</td>
                <td style={{ textAlign: 'right', padding: 6 }}>{t.price.toFixed(2)} {quote}</td>
                <td style={{ textAlign: 'right', padding: 6 }}>{t.amount.toFixed(6)} {base}</td>
                <td style={{ textAlign: 'right', padding: 6 }}>{(t.price * t.amount).toFixed(2)} {quote}</td>
                <td style={{ textAlign: 'right', padding: 6, color: t.realizedPnL > 0 ? '#2ecc40' : t.realizedPnL < 0 ? '#ff4136' : '#888' }}>{t.realizedPnL ? t.realizedPnL.toFixed(2) + ' ' + quote : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 