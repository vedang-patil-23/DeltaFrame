const ccxt = require('ccxt');
const fs = require('fs');

(async () => {
  const exchange = new ccxt.binance();
  await exchange.loadMarkets();
  const symbols = exchange.symbols;
  const active = [];
  for (const symbol of symbols) {
    try {
      const ob = await exchange.fetchOrderBook(symbol, 1);
      if (ob.bids.length > 0 && ob.asks.length > 0) {
        active.push(symbol);
        console.log('Active:', symbol);
      }
    } catch (e) {
      // Ignore errors for symbols with no order book
    }
  }
  fs.writeFileSync('binance_active_symbols.json', JSON.stringify(active, null, 2));
  console.log('Done. Active symbols saved to binance_active_symbols.json');
})(); 