import type { PriceHistory, PricePoint, QuoteMap } from './types';
import { load, save } from './storage';
import { todayISO } from './format';

const KEY = 'price-history';
const MAX_POINTS = 800;

export function loadPrices(): PriceHistory {
  return load<PriceHistory>(KEY, {});
}

/** Enregistre le cours du jour de chaque titre suivi (écrasé jusqu'à la clôture). */
export function recordPrices(quotes: QuoteMap, tickers: string[]): PriceHistory {
  const hist = loadPrices();
  const date = todayISO();
  for (const t of tickers) {
    const q = quotes[t];
    if (!q) continue;
    const series = (hist[t] ?? []).filter((p) => p.date !== date);
    series.push({ date, price: q.price });
    series.sort((a, b) => a.date.localeCompare(b.date));
    hist[t] = series.slice(-MAX_POINTS);
  }
  save(KEY, hist);
  return hist;
}

function weekdaysBetween(from: string, toExclusive: string): string[] {
  const days: string[] = [];
  const d = new Date(from + 'T12:00:00');
  while (todayISO(d) < toExclusive) {
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) days.push(todayISO(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/**
 * Mode démo uniquement : historique simulé d'un titre, marche aléatoire remontée
 * dans le temps à partir de la clôture d'hier (donc cohérente avec le cours actuel).
 */
export function seedTicker(ticker: string, fromDate: string, prevClose: number): PriceHistory {
  const hist = loadPrices();
  if (hist[ticker]?.length) return hist;
  const days = weekdaysBetween(fromDate, todayISO());
  const series: PricePoint[] = new Array(days.length);
  let p = prevClose;
  for (let i = days.length - 1; i >= 0; i--) {
    series[i] = { date: days[i], price: Math.round(p * 100) / 100 };
    const r = (Math.random() - 0.5) * 0.026 + 0.0004; // ~1,3 %/jour, légère dérive haussière
    p = p / (1 + r);
  }
  hist[ticker] = series.slice(-MAX_POINTS);
  save(KEY, hist);
  return hist;
}

export function clearPrices(): void {
  save(KEY, {});
}

/** Cours au jour `date` (dernier connu à cette date), ou undefined */
export function priceAt(series: PricePoint[] | undefined, date: string): number | undefined {
  if (!series?.length) return undefined;
  let lo = 0;
  let hi = series.length - 1;
  let ans: number | undefined;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].date <= date) {
      ans = series[mid].price;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

export { weekdaysBetween };
