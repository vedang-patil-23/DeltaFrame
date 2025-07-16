const { z } = require('zod');

const HoldingSchema = z.object({
  asset: z.string(),
  quantity: z.string().regex(/^\d+(\.\d+)?$/),
  avgBuyPrice: z.string().regex(/^\d+(\.\d+)?$/),
  active: z.string().regex(/^[01]$/)
});

const TradeSchema = z.object({
  timestamp: z.string(),
  side: z.enum(['buy', 'sell']),
  asset: z.string(),
  price: z.string().regex(/^\d+(\.\d+)?$/),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
  realizedPnL: z.string(),
  uid: z.string()
});

const BalanceSchema = z.object({
  balance: z.string().regex(/^\d+(\.\d+)?$/)
});

function normalizeHolding(h) {
  return {
    asset: typeof h.asset === 'string' ? h.asset : '',
    quantity: typeof h.quantity === 'string' ? h.quantity : '0.000000',
    avgBuyPrice: typeof h.avgBuyPrice === 'string' ? h.avgBuyPrice : '0.00',
    active: h.active === '0' ? '0' : '1'
  };
}

function normalizeTrade(t) {
  return {
    timestamp: typeof t.timestamp === 'string' ? t.timestamp : new Date().toISOString(),
    side: t.side === 'sell' ? 'sell' : 'buy',
    asset: typeof t.asset === 'string' ? t.asset : '',
    price: typeof t.price === 'string' ? t.price : '0.00',
    amount: typeof t.amount === 'string' ? t.amount : '0.00',
    realizedPnL: typeof t.realizedPnL === 'string' ? t.realizedPnL : '0.00',
    uid: typeof t.uid === 'string' ? t.uid : `${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`
  };
}

function normalizeBalance(b) {
  return {
    balance: typeof b.balance === 'string' ? b.balance : '100000.00'
  };
}

module.exports = {
  HoldingSchema,
  TradeSchema,
  BalanceSchema,
  normalizeHolding,
  normalizeTrade,
  normalizeBalance
}; 