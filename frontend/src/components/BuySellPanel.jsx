import React, { useState, useEffect } from 'react';

export default function BuySellPanel({ symbol, currentPrice, holdings, onOrder, balance }) {
  const [side, setSide] = useState('buy');
  const [orderType, setOrderType] = useState('market');
  const [price, setPrice] = useState(currentPrice || '');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const base = symbol ? symbol.split('/')[0] : '';
  const quote = symbol ? symbol.split('/')[1] : '';
  const baseHoldingObj = Array.isArray(holdings) ? holdings.find(h => h.asset === base) : undefined;
  const availableBase = baseHoldingObj && baseHoldingObj.quantity !== undefined ? parseFloat(baseHoldingObj.quantity) : 0;
  const availableQuote = typeof balance === 'number' ? balance : 0;

  useEffect(() => {
    if (orderType === 'market') setPrice(currentPrice || '');
  }, [orderType, currentPrice]);

  // Calculate cost for entered amount
  const cost = (Number(amount) && Number(price)) ? (Number(amount) * Number(price)) : 0;

  // % buttons: fill amount with max units for that % of available quote at current price
  const handlePercent = pct => {
    if (side === 'buy') {
      if ((orderType === 'market' && currentPrice) || (orderType === 'limit' && price)) {
        const p = orderType === 'market' ? currentPrice : Number(price);
        const maxUnits = (availableQuote * pct / 100) / p;
        setAmount(maxUnits > 0 ? maxUnits.toFixed(6) : '');
      }
    } else {
      setAmount(((availableBase * pct) / 100).toFixed(6));
    }
  };

  // Validation
  const isInvalid = () => {
    const p = orderType === 'market' ? currentPrice : Number(price);
    const a = Number(amount);
    if (!symbol || !p || !a || a <= 0) return true;
    if (side === 'buy') {
      if ((a * p) > availableQuote) return true;
      if (availableQuote < p) return true;
    } else {
      if (a > availableBase) return true;
      if (availableBase <= 0) return true;
    }
    return false;
  };

  const handleOrder = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    const p = orderType === 'market' ? currentPrice : Number(price);
    const a = Number(amount);
    if (!symbol || !p || !a || a <= 0) {
      setError('Enter valid price and amount.');
      setLoading(false);
      return;
    }
    if (side === 'buy') {
      if ((a * p) > availableQuote) {
        setError('Insufficient balance.');
        setLoading(false);
        return;
      }
      if (availableQuote < p) {
        setError('Not enough funds to buy 1 unit.');
        setLoading(false);
        return;
      }
    } else {
      if (a > availableBase) {
        setError('Insufficient holdings.');
        setLoading(false);
        return;
      }
      if (availableBase <= 0) {
        setError('No units to sell.');
        setLoading(false);
        return;
      }
    }
    try {
      const res = await fetch('http://localhost:3001/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          side,
          orderType,
          symbol,
          price: p,
          amount: a
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        setError('Order failed: ' + errText);
        setLoading(false);
        return;
      }
      setSuccess(`${side === 'buy' ? 'Buy' : 'Sell'} order successful!`);
      setAmount('');
      setError('');
      if (typeof onOrder === 'function') {
        await onOrder({ side, orderType, price: p, amount: a });
      }
    } catch (err) {
      setError('Order failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 20, background: 'var(--color-card)', marginTop: 32, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
      <div style={{ marginBottom: 10, fontWeight: 600, fontSize: 17, textAlign: 'center' }}>
        {symbol ? `${side === 'buy' ? 'Buy' : 'Sell'} ${base} (${symbol})` : ''}
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <button onClick={() => setSide('buy')} style={{ flex: 1, background: side==='buy'?'#2ecc40':'#eee', color: side==='buy'?'#fff':'#222', fontWeight: 600, border: 'none', borderRadius: 6, padding: 8 }}>Buy</button>
        <button onClick={() => setSide('sell')} style={{ flex: 1, background: side==='sell'?'#ff4136':'#eee', color: side==='sell'?'#fff':'#222', fontWeight: 600, border: 'none', borderRadius: 6, padding: 8 }}>Sell</button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setOrderType('market')} style={{ flex: 1, background: orderType==='market'?'#ddd':'#fff', fontWeight: 600, border: '1px solid #ccc', borderRadius: 6, padding: 6 }}>Market</button>
        <button onClick={() => setOrderType('limit')} style={{ flex: 1, background: orderType==='limit'?'#ddd':'#fff', fontWeight: 600, border: '1px solid #ccc', borderRadius: 6, padding: 6 }}>Limit</button>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>Available: {side==='buy' ? availableQuote.toFixed(2) + ' ' + quote : availableBase.toFixed(6) + ' ' + base}</div>
        {orderType === 'limit' && (
          <input type="number" step="any" value={price} onChange={e => setPrice(e.target.value)} placeholder="Price" style={{ width: '100%', marginBottom: 8, padding: 6, borderRadius: 4, border: '1px solid #ccc' }} />
        )}
        <input type="number" step="any" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Amount (${base})`} style={{ width: '100%', marginBottom: 8, padding: 6, borderRadius: 4, border: '1px solid #ccc' }} />
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {[25,50,75,100].map(pct => (
            <button key={pct} onClick={() => handlePercent(pct)} style={{ flex: 1, fontSize: 13, background: '#f6f6f6', border: '1px solid #ddd', borderRadius: 4, padding: 4 }}>{pct}%</button>
          ))}
        </div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>
          {amount && price ? `Cost: ${(Number(amount) * Number(price)).toFixed(2)} ${quote}` : ''}
        </div>
        {error && <div style={{ color: 'red', fontSize: 13, marginBottom: 6 }}>{error}</div>}
        {success && <div style={{ color: 'green', fontSize: 13, marginBottom: 6 }}>{success}</div>}
        <button
          onClick={handleOrder}
          style={{ width: '100%', background: side==='buy'?'#2ecc40':'#ff4136', color: '#fff', fontWeight: 600, border: 'none', borderRadius: 6, padding: 10, fontSize: 16, marginTop: 4, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          disabled={isInvalid() || loading}
        >
          {loading ? (side==='buy' ? 'Buying...' : 'Selling...') : (side==='buy' ? `Buy ${base}` : `Sell ${base}`)}
        </button>
      </div>
    </div>
  );
} 