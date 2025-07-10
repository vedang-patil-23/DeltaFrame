import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

function randomPercent(val, percent) {
  if (!percent) return val;
  const p = percent / 100;
  const r = (Math.random() * 2 - 1) * p; // random between -p and +p
  return val * (1 + r);
}

function getDepth(data) {
  let sum = 0;
  return data.map(([price, qty]) => {
    sum += qty;
    return [price, sum];
  });
}

export default function OrderBookCharts({ orderbook, qtOffset, amtOffset, loading, chartType = 'raw' }) {
  const [view, setView] = useState(chartType);
  if (loading) return <div>Loading...</div>;

  // Apply random ±QT% to buy quantities, random ±Amt% to sell prices
  let bids = orderbook.bids.map(([price, qty]) => [price, randomPercent(qty, qtOffset)]);
  let asks = orderbook.asks.map(([price, qty]) => [randomPercent(price, amtOffset), qty]);

  if (view === 'depth') {
    bids = getDepth(bids);
    asks = getDepth(asks);
  }

  const buyData = {
    labels: bids.map(([price]) => price),
    datasets: [
      {
        label: view === 'depth' ? 'Buy Depth' : 'Buy (Bids)',
        data: bids.map(([, qty]) => qty),
        borderColor: 'green',
        backgroundColor: 'rgba(0,128,0,0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };
  const sellData = {
    labels: asks.map(([price]) => price),
    datasets: [
      {
        label: view === 'depth' ? 'Sell Depth' : 'Sell (Asks)',
        data: asks.map(([, qty]) => qty),
        borderColor: 'red',
        backgroundColor: 'rgba(255,0,0,0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { x: { title: { display: true, text: 'Price' } }, y: { title: { display: true, text: view === 'depth' ? 'Cumulative Qty' : 'Qty' } } },
  };
  return (
    <div style={{ flex: 1 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <button
          onClick={() => setView('raw')}
          style={{ marginRight: 8, padding: '2px 12px', fontWeight: view === 'raw' ? 700 : 400, background: view === 'raw' ? '#e0ffe0' : '#fff', border: '1px solid #ccc', borderRadius: 4 }}
        >Raw</button>
        <button
          onClick={() => setView('depth')}
          style={{ padding: '2px 12px', fontWeight: view === 'depth' ? 700 : 400, background: view === 'depth' ? '#ffe0e0' : '#fff', border: '1px solid #ccc', borderRadius: 4 }}
        >Depth</button>
      </div>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ textAlign: 'center', fontWeight: 600 }}>{view === 'depth' ? 'Buy Depth' : 'Buy'}</div>
          <Line data={buyData} options={options} height={220} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ textAlign: 'center', fontWeight: 600 }}>{view === 'depth' ? 'Sell Depth' : 'Sell'}</div>
          <Line data={sellData} options={options} height={220} />
        </div>
      </div>
    </div>
  );
} 