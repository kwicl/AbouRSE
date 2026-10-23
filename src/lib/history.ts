import type { DailyPoint, IntradayPoint, Position, PriceHistory, Sale } from './types';
import { load, save } from './storage';
import { todayISO } from './format';
import { priceAt } from './prices';

const INTRADAY_MIN_GAP_MS = 60_000;
const INTRADAY_MAX = 600;

interface IntradayStore {
  date: string;
  points: IntradayPoint[];
}

export function loadIntraday(): IntradayPoint[] {
  const s = load<IntradayStore | null>('history-intraday', null);
  return s && s.date === todayISO() ? s.points : [];
}

/** Point intraday de la séance (1/min), pour la vue 1D. */
export function recordIntraday(value: number, invested: number): IntradayPoint[] {
  const date = todayISO();
  let points = loadIntraday();
  const now = Date.now();
  const last = points[points.length - 1];
  if (!last || now - last.t >= INTRADAY_MIN_GAP_MS) points = [...points, { t: now, value, invested }].slice(-INTRADAY_MAX);
  else points = [...points.slice(0, -1), { t: last.t, value, invested }];
  save('history-intraday', { date, points });
  return points;
}

export function clearIntraday(): void {
  save('history-intraday', { date: todayISO(), points: [] });
}

interface Lot {
  positionId: string;
  ticker: string;
  buyPrice: number;
  buyDate: string;
  qtyNow: number;
}

/**
 * Courbe journalière du portefeuille recalculée à partir des cours de clôture réels :
 * pour chaque séance, quantité détenue × cours de clôture (les ventes réduisent la quantité à partir de leur date).
 */
export function computeDaily(positions: Position[], sales: Sale[], prices: PriceHistory): DailyPoint[] {
  const lots: Lot[] = positions.map((p) => ({ positionId: p.id, ticker: p.ticker, buyPrice: p.buyPrice, buyDate: p.buyDate, qtyNow: p.qty }));
  // positions entièrement vendues : reconstituées depuis les ventes
  for (const s of sales) {
    if (lots.some((l) => l.positionId === s.positionId)) continue;
    lots.push({ positionId: s.positionId, ticker: s.ticker, buyPrice: s.buyPrice, buyDate: s.buyDate ?? s.date, qtyNow: 0 });
  }
  if (lots.length === 0) return [];

  const start = lots.reduce((m, l) => (l.buyDate < m ? l.buyDate : m), todayISO());
  const dates = new Set<string>();
  for (const l of lots) for (const p of prices[l.ticker] ?? []) if (p.date >= start) dates.add(p.date);

  const salesByLot = new Map<string, Sale[]>();
  for (const s of sales) salesByLot.set(s.positionId, [...(salesByLot.get(s.positionId) ?? []), s]);

  return [...dates].sort().flatMap((date) => {
    let invested = 0;
    let value = 0;
    for (const l of lots) {
      if (l.buyDate > date) continue;
      const soldAfter = (salesByLot.get(l.positionId) ?? []).filter((s) => s.date > date).reduce((n, s) => n + s.qty, 0);
      const qty = l.qtyNow + soldAfter;
      if (qty <= 0) continue;
      invested += qty * l.buyPrice;
      value += qty * (priceAt(prices[l.ticker], date) ?? l.buyPrice);
    }
    return invested > 0 ? [{ date, invested, value }] : [];
  });
}
