import React from 'react';
import { useTable } from 'react-table';

function formatNum(n) {
  return n > 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n.toFixed(6);
}

export default function OrderBookTable({ bids, asks }) {
  // Compute totals for bids and asks
  let bidTotal = 0;
  const bidRows = bids.map(([price, qty]) => {
    bidTotal += qty;
    return { price, qty, total: bidTotal };
  });
  let askTotal = 0;
  const askRows = asks.map(([price, qty]) => {
    askTotal += qty;
    return { price, qty, total: askTotal };
  });

  const columns = React.useMemo(() => [
    { Header: 'Price', accessor: 'price' },
    { Header: 'Amount', accessor: 'qty' },
    { Header: 'Total', accessor: 'total' },
  ], []);

  const bidTable = useTable({ columns, data: bidRows });
  const askTable = useTable({ columns, data: askRows });

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <div style={{ flex: 1 }}>
        <div style={{ textAlign: 'center', fontWeight: 600, color: 'green' }}>Bids</div>
        <table {...bidTable.getTableProps()} className="deltaframe-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            {bidTable.headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <th {...column.getHeaderProps()} style={{ borderBottom: '1px solid #eee', padding: 4 }}>{column.render('Header')}</th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...bidTable.getTableBodyProps()}>
            {bidTable.rows.map(row => {
              bidTable.prepareRow(row);
              return (
                <tr {...row.getRowProps()} className="bid" key={row.id}>
                  {row.cells.map(cell => (
                    <td {...cell.getCellProps()} style={{ padding: 4 }}>{formatNum(cell.value)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ textAlign: 'center', fontWeight: 600, color: 'red' }}>Asks</div>
        <table {...askTable.getTableProps()} className="deltaframe-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            {askTable.headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <th {...column.getHeaderProps()} style={{ borderBottom: '1px solid #eee', padding: 4 }}>{column.render('Header')}</th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...askTable.getTableBodyProps()}>
            {askTable.rows.map(row => {
              askTable.prepareRow(row);
              return (
                <tr {...row.getRowProps()} className="ask" key={row.id}>
                  {row.cells.map(cell => (
                    <td {...cell.getCellProps()} style={{ padding: 4 }}>{formatNum(cell.value)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
} 