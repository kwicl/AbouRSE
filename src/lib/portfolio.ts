import type { Position, QuoteMap } from './types';

export interface Row extends Position {
  price: number;
  prevClose: number;
  invested: number;
  value: number;
  pnl: number;
  pnlPct: number;
  dayPct: number;
  dayChange: number;
}

export interface Totals {
  value: number;
  invested: number;
  pnl: number;
  pnlPct: number;
  dayChange: number;
  dayPct: number;
}

export function buildRows(positions: Position[], quotes: QuoteMap): Row[] {
  return positions.map((p) => {
    const q = quotes[p.ticker];
    const price = q?.price ?? p.buyPrice;
    const prevClose = q?.prevClose ?? price;
    const invested = p.buyPrice * p.qty;
    const value = price * p.qty;
    const pnl = value - invested;
    return {
      ...p,
      price,
      prevClose,
      invested,
      value,
      pnl,
      pnlPct: invested ? (pnl / invested) * 100 : 0,
      dayPct: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
      dayChange: (price - prevClose) * p.qty,
    };
  });
}

export function totals(rows: Row[]): Totals {
  const value = rows.reduce((s, r) => s + r.value, 0);
  const invested = rows.reduce((s, r) => s + r.invested, 0);
  const dayChange = rows.reduce((s, r) => s + r.dayChange, 0);
  const prevValue = value - dayChange;
  const pnl = value - invested;
  return {
    value,
    invested,
    pnl,
    pnlPct: invested ? (pnl / invested) * 100 : 0,
    dayChange,
    dayPct: prevValue ? (dayChange / prevValue) * 100 : 0,
  };
}
