import React, { useState } from 'react';
import PropTypes from 'prop-types';

export default function HoldingsTable({ holdings, currentPrice, symbol, onSell, balance }) {
  const [sellAsset, setSellAsset] = useState(null);
  const [sellAmount, setSellAmount] = useState('');
  if (!symbol) return null;
  const base = symbol.split('/')[0];
  const quote = symbol.split('/')[1];

  // Normalize holdings: ensure every holding has all required fields
  const normalizedHoldings = (holdings || []).map(h => ({
    asset: h.asset || '',
    quantity: h.quantity !== undefined ? parseFloat(h.quantity) : 0,
    avgBuyPrice: h.avgBuyPrice !== undefined ? parseFloat(h.avgBuyPrice) : 0,
    active: h.active === undefined ? '1' : h.active
  }));

  const baseHolding = normalizedHoldings.find(h => h.asset === base) || { quantity: 0, avgBuyPrice: 0 };
  const quoteHolding = normalizedHoldings.find(h => h.asset === quote) || { quantity: 0, avgBuyPrice: 0 };
  const unrealizedPnL = baseHolding.quantity > 0 ? (currentPrice - baseHolding.avgBuyPrice) * baseHolding.quantity : 0;
  const unrealizedPnLPercent = baseHolding.quantity > 0 && baseHolding.avgBuyPrice > 0 ? ((currentPrice - baseHolding.avgBuyPrice) / baseHolding.avgBuyPrice) * 100 : 0;

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

  const hasHoldings = normalizedHoldings && normalizedHoldings.length > 0 && normalizedHoldings.some(h => h.active === '1');

  // Calculate total portfolio value (USDT + crypto at current price)
  let portfolioValue = 0;
  normalizedHoldings.filter(h => h.active === '1').forEach(h => {
    if (h.asset === 'USDT') {
      portfolioValue += h.quantity;
    } else {
      portfolioValue += h.quantity * (currentPrice || 0);
    }
  });

  return (
    <div style={{ margin: '32px auto', maxWidth: 500, background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 18 }}>
      <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 8, color: '#222', textAlign: 'left' }}>
        Portfolio Value: <span style={{ color: portfolioValue >= 100000 ? '#2ecc40' : '#ff4136', fontWeight: 700 }}>${portfolioValue.toFixed(2)}</span>
        <span style={{ marginLeft: 18, fontWeight: 600, color: '#222' }}>
          Balance: <span style={{ color: balance > 0 ? '#2ecc40' : '#ff4136', fontWeight: 700 }}>${balance.toFixed(2)}</span>
        </span>
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
          </tr>
        </thead>
        <tbody>
          {hasHoldings ? (
            normalizedHoldings.filter(h => h.active === '1').map(holding => {
              const asset = holding.asset || '—';
              const price = (asset === 'USDT') ? 1 : (currentPrice || 0);
              const avg = holding.avgBuyPrice !== undefined ? holding.avgBuyPrice : 0;
              const qty = holding.quantity !== undefined ? holding.quantity : 0;
              const unrealized = asset !== 'USDT' ? (qty > 0 ? (currentPrice - avg) * qty : 0) : null;
              const unrealizedPct = asset !== 'USDT' && qty > 0 && avg > 0 ? ((currentPrice - avg) / avg) * 100 : null;
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
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: 24, fontSize: 16 }}>
                No holdings. Use the Buy panel to purchase crypto.
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
  balance: PropTypes.number
}; 