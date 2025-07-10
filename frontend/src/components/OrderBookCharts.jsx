import React from 'react';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import ExportingModule from 'highcharts/modules/exporting';
import ExportDataModule from 'highcharts/modules/export-data';

// Initialize modules (ESM/CJS compatible)
if (typeof ExportingModule === 'function') {
  ExportingModule(Highcharts);
} else if (ExportingModule && typeof ExportingModule.default === 'function') {
  ExportingModule.default(Highcharts);
}
if (typeof ExportDataModule === 'function') {
  ExportDataModule(Highcharts);
} else if (ExportDataModule && typeof ExportDataModule.default === 'function') {
  ExportDataModule.default(Highcharts);
}

const CHART_TYPES = [
  { key: 'candlestick', label: 'Candlestick' },
  { key: 'line', label: 'Line' },
  { key: 'area', label: 'Area' },
];

export default function OrderBookCharts({ exchange, symbol, interval = '1m', continuous }) {
  const [chartType, setChartType] = React.useState('candlestick');
  const [ohlcv, setOhlcv] = React.useState([]);
  const [ohlcvError, setOhlcvError] = React.useState('');
  // Accumulated OHLCV state
  const ohlcvAccumRef = React.useRef([]);

  // Reset accumulated OHLCV when exchange or symbol changes
  React.useEffect(() => {
    ohlcvAccumRef.current = [];
    setOhlcv([]);
  }, [exchange, symbol]);

  // Fetch and accumulate OHLCV data
  React.useEffect(() => {
    if (!exchange || !symbol) return;
    fetch(`http://localhost:3001/api/ohlcv?exchange=${exchange}&symbol=${encodeURIComponent(symbol)}&interval=${interval}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Deduplicate and accumulate by timestamp
          const seen = new Set(ohlcvAccumRef.current.map(d => d[0]));
          const newData = data.filter(d => !seen.has(d[0]));
          ohlcvAccumRef.current = [...ohlcvAccumRef.current, ...newData];
          ohlcvAccumRef.current.sort((a, b) => a[0] - b[0]);
          setOhlcv([...ohlcvAccumRef.current]);
          setOhlcvError('');
        } else if (data && data.error) {
          setOhlcv([]);
          setOhlcvError(data.error);
        } else {
          setOhlcv([]);
          setOhlcvError('No chart data available');
        }
      })
      .catch(() => {
        setOhlcv([]);
        setOhlcvError('Failed to load chart data');
      });
  }, [exchange, symbol, interval]);

  // Real-time update (continuous mode)
  React.useEffect(() => {
    if (!continuous) return;
    const intervalId = setInterval(() => {
      fetch(`http://localhost:3001/api/ohlcv?exchange=${exchange}&symbol=${encodeURIComponent(symbol)}&interval=${interval}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            // Deduplicate and accumulate by timestamp
            const seen = new Set(ohlcvAccumRef.current.map(d => d[0]));
            const newData = data.filter(d => !seen.has(d[0]));
            ohlcvAccumRef.current = [...ohlcvAccumRef.current, ...newData];
            ohlcvAccumRef.current.sort((a, b) => a[0] - b[0]);
            setOhlcv([...ohlcvAccumRef.current]);
          }
        });
    }, 5000);
    return () => clearInterval(intervalId);
  }, [continuous, exchange, symbol, interval]);

  // Detect app theme (light/dark)
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  const isDark = theme === 'dark';

  // Prepare Highcharts options
  const options = React.useMemo(() => {
    let series = [];
    if (chartType === 'candlestick') {
      series = [{
        type: 'candlestick',
        name: symbol,
        data: ohlcv.map(([time, open, high, low, close]) => [time, open, high, low, close]),
        tooltip: { valueDecimals: 2 }
      }];
    } else if (chartType === 'line') {
      series = [{
        type: 'line',
        name: symbol,
        data: ohlcv.map(([time, , , , close]) => [time, close]),
        tooltip: { valueDecimals: 2 }
      }];
    } else if (chartType === 'area') {
      series = [{
        type: 'area',
        name: symbol,
        data: ohlcv.map(([time, , , , close]) => [time, close]),
        tooltip: { valueDecimals: 2 }
      }];
    }
    return {
      chart: {
        height: 340,
        backgroundColor: isDark ? '#181a1b' : '#fff',
        zoomType: 'x',
        panning: { enabled: true },
        panKey: 'shift',
        style: { color: isDark ? '#fff' : '#222' }
      },
      title: { text: '' },
      xAxis: {
        type: 'datetime',
        gridLineColor: isDark ? '#333' : '#eee',
        labels: { style: { color: isDark ? '#fff' : '#222' } }
      },
      yAxis: {
        opposite: false,
        gridLineColor: isDark ? '#333' : '#eee',
        labels: { style: { color: isDark ? '#fff' : '#222' } },
        min: null,
        max: null,
        startOnTick: false,
        endOnTick: false,
        tickAmount: 6
      },
      rangeSelector: { enabled: false },
      navigator: { enabled: false },
      scrollbar: { enabled: false },
      series,
      credits: { enabled: false },
      plotOptions: {
        candlestick: {
          color: isDark ? '#e44' : '#e44',
          upColor: isDark ? '#2b8a3e' : '#2b8a3e',
          lineColor: isDark ? '#e44' : '#e44',
          upLineColor: isDark ? '#2b8a3e' : '#2b8a3e',
          dataGrouping: { enabled: false }
        },
        line: {
          color: isDark ? '#8faaff' : '#646cff',
          lineWidth: 2,
          dataGrouping: { enabled: false }
        },
        area: {
          color: isDark ? '#8faaff' : '#646cff',
          fillOpacity: 0.2,
          lineWidth: 2,
          dataGrouping: { enabled: false }
        }
      },
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: isDark ? '#222' : '#fff',
        borderColor: isDark ? '#888' : '#ccc',
        style: { color: isDark ? '#fff' : '#222' },
        formatter: function() {
          if (this.points && this.points.length && this.points[0].point) {
            const p = this.points[0].point;
            if (chartType === 'candlestick') {
              return `<b>${symbol}</b><br/>Open: <b>${p.open}</b><br/>High: <b>${p.high}</b><br/>Low: <b>${p.low}</b><br/>Close: <b>${p.close}</b><br/>Time: <b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', p.x)}</b>`;
            } else {
              return `<b>${symbol}</b><br/>Close: <b>${p.y}</b><br/>Time: <b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', p.x)}</b>`;
            }
          }
          return false;
        }
      },
      exporting: { enabled: true },
      time: { useUTC: false },
      lang: { resetZoom: 'Reset Zoom' },
      resetZoomButton: { position: { align: 'right', x: -10, y: 10 } }
    };
  }, [ohlcv, chartType, symbol, isDark]);

  return (
    <div style={{ flex: 1, minWidth: 350 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        {CHART_TYPES.map(t => (
          <button
            key={t.key}
            onClick={() => setChartType(t.key)}
            style={{
              padding: '2px 12px',
              fontWeight: chartType === t.key ? 700 : 400,
              background: chartType === t.key
                ? (isDark ? 'rgba(100,108,255,0.18)' : '#e0e0ff')
                : (isDark ? 'var(--color-btn-bg)' : '#fff'),
              color: chartType === t.key
                ? (isDark ? '#fff' : '#213547')
                : (isDark ? '#fff' : '#213547'),
              border: chartType === t.key
                ? '2px solid #4a90e2'
                : '1px solid #ccc',
              borderRadius: 6,
              marginRight: 4,
              boxShadow: chartType === t.key ? '0 0 0 2px #2222ff33' : 'none',
              transition: 'background 0.2s, color 0.2s, border 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
        {/* Export buttons (use Highcharts' built-in menu) */}
        <span style={{ marginLeft: 16, color: '#888', fontSize: 13 }}>
          Use the ⠇ menu (top right of chart) to export as PNG, SVG, PDF, or CSV
        </span>
      </div>
      <div style={{ width: '100%', minWidth: 350, minHeight: 200, height: 340, background: 'var(--color-card)', borderRadius: 8, position: 'relative' }}>
        {ohlcvError ? (
          <div style={{ position: 'absolute', top: 120, left: 0, right: 0, textAlign: 'center', color: 'red', fontWeight: 600 }}>
            {ohlcvError}
          </div>
        ) : (
          <HighchartsReact
            highcharts={Highcharts}
            constructorType={'stockChart'}
            options={options}
          />
        )}
      </div>
      {/* Debug overlay for OHLCV data */}
      <div style={{ fontSize: 12, color: '#888', marginTop: 4, textAlign: 'center' }}>
        {ohlcv && ohlcv.length > 0 ? (
          <>
            OHLCV points: {ohlcv.length} | First: {new Date(ohlcv[0][0]).toLocaleString()} | Last: {new Date(ohlcv[ohlcv.length-1][0]).toLocaleString()}
          </>
        ) : (
          'No OHLCV data'
        )}
      </div>
    </div>
  );
} 