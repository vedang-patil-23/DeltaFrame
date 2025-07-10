import React from 'react';

export default function ExchangeSelector({ exchanges, value, onChange, supportedExchanges = [] }) {
  return (
    <div>
      <label style={{ fontWeight: 600 }}>Exchange </label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ padding: 4, minWidth: 120 }}>
        {exchanges.map(ex => (
          <option key={ex} value={ex}>
            {supportedExchanges.includes(ex) ? '● ' : ''}
            {ex.charAt(0).toUpperCase() + ex.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
} 