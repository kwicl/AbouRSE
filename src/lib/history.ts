import type { DailyPoint, IntradayPoint, Position, PriceHistory } from './types';
import { priceAt, weekdaysBetween } from './prices';
import { load, save } from './storage';
import { todayISO } from './format';

const INTRADAY_MIN_GAP_MS = 60_000;
const INTRADAY_MAX = 600;
const STEP_MS = 5 * 60_000;

interface IntradayStore {
  date: string;
  points: IntradayPoint[];
}

export function loadDaily(): DailyPoint[] {
  return load<DailyPoint[]>('history-daily', []);
}

export function loadIntraday(): IntradayPoint[] {
  const s = load<IntradayStore | null>('history-intraday', null);
  return s && s.date === todayISO() ? s.points : [];
}

/** Enregistre la valeur courante : point du jour (écrasé jusqu'à la clôture) + point intraday (1/min). */
export function recordSnapshot(value: number, invested: number): { daily: DailyPoint[]; intraday: IntradayPoint[] } {
  const date = todayISO();
  const daily = loadDaily().filter((p) => p.date !== date);
  daily.push({ date, value, invested });
  daily.sort((a, b) => a.date.localeCompare(b.date));
  save('history-daily', daily);

  let intraday = loadIntraday();
  const now = Date.now();
  const last = intraday[intraday.length - 1];
  if (!last || now - last.t >= INTRADAY_MIN_GAP_MS) {
    intraday = [...intraday, { t: now, value, invested }].slice(-INTRADAY_MAX);
  } else {
    intraday = [...intraday.slice(0, -1), { t: last.t, value, invested }];
  }
  save('history-intraday', { date, points: intraday });
  return { daily, intraday };
}

export function clearHistory(): void {
  save('history-daily', []);
  save('history-intraday', { date: todayISO(), points: [] });
}

/**
 * Historique simulé pour le portefeuille démo, recalculé à partir de l'historique de cours
 * de chaque titre (donc cohérent avec les mini-graphes du tableau).
 * Utilisé uniquement au premier lancement avec le portefeuille démo, jamais sur des données réelles.
 */
export function seedDemoHistory(positions: Position[], prices: PriceHistory, prevValue: number, value: number): void {
  const start = positions.reduce((m, p) => (p.buyDate < m ? p.buyDate : m), todayISO());
  const daily: DailyPoint[] = weekdaysBetween(start, todayISO())
    .map((date) => {
      const held = positions.filter((p) => p.buyDate <= date);
      const invested = held.reduce((s, p) => s + p.buyPrice * p.qty, 0);
      const val = held.reduce((s, p) => s + p.qty * (priceAt(prices[p.ticker], date) ?? p.buyPrice), 0);
      return { date, invested, value: val };
    })
    .filter((p) => p.invested > 0);
  save('history-daily', daily);
  const totalInvested = positions.reduce((s, p) => s + p.buyPrice * p.qty, 0);

  // séance du jour : de 09:30 à maintenant (max 15:30), pas de 5 min
  const open = new Date();
  open.setHours(9, 30, 0, 0);
  const close = new Date();
  close.setHours(15, 30, 0, 0);
  const stop = Math.min(Date.now(), close.getTime());
  const steps = Math.max(0, Math.floor((stop - open.getTime()) / STEP_MS));
  let w = 0;
  const ws = Array.from({ length: steps + 1 }, () => (w += (Math.random() - 0.5) * 0.0015));
  const points: IntradayPoint[] = [];
  for (let i = 0; i <= steps && stop > open.getTime(); i++) {
    const frac = steps ? i / steps : 1;
    const v = prevValue + (value - prevValue) * frac + (ws[i] - frac * ws[steps]) * prevValue;
    points.push({ t: open.getTime() + i * STEP_MS, value: v, invested: totalInvested });
  }
  save('history-intraday', { date: todayISO(), points });
}
