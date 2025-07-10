import React from 'react';

export default function OffsetInputs({ qtOffset, setQtOffset, amtOffset, setAmtOffset }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <div>
        <label style={{ fontWeight: 600 }}>QT </label>
        <input type="number" value={qtOffset} onChange={e => setQtOffset(Number(e.target.value))} style={{ width: 60, padding: 2 }} />
      </div>
      <div>
        <label style={{ fontWeight: 600 }}>Amt </label>
        <input type="number" value={amtOffset} onChange={e => setAmtOffset(Number(e.target.value))} style={{ width: 60, padding: 2 }} />
      </div>
    </div>
  );
} 