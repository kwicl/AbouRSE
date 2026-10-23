import type { PriceHistory, PricePoint, QuoteMap } from './types';
import { load, save } from './storage';
import { todayISO } from './format';

const KEY = 'price-history';
const FETCHED_KEY = 'price-history-fetched';

export function loadPrices(): PriceHistory {
  return load<PriceHistory>(KEY, {});
}

/** Historique réel des cours de clôture journaliers d'un titre (~6 ans) */
async function fetchHistory(ticker: string): Promise<PricePoint[]> {
  const res = await fetch(`/api/history?ticker=${encodeURIComponent(ticker)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const points = ((await res.json()) as { points?: PricePoint[] }).points;
  if (!Array.isArray(points)) throw new Error('Format inattendu');
  return points;
}

/**
 * Charge (une fois par jour et par titre) l'historique réel des titres détenus.
 * Les titres en échec gardent leur historique précédent.
 */
export async function ensureHistories(tickers: string[]): Promise<PriceHistory> {
  const hist = loadPrices();
  const fetched = load<Record<string, string>>(FETCHED_KEY, {});
  const today = todayISO();
  const todo = tickers.filter((t) => fetched[t] !== today || !hist[t]?.length);
  await Promise.all(
    todo.map(async (t) => {
      try {
        const series = await fetchHistory(t);
        if (series.length) {
          // le point « aujourd'hui » enregistré depuis le flux direct reste prioritaire
          const live = hist[t]?.find((p) => p.date === today);
          hist[t] = live ? [...series.filter((p) => p.date !== today), live] : series;
          fetched[t] = today;
        }
      } catch {
        /* réseau indisponible : on réessaiera au prochain chargement */
      }
    }),
  );
  save(KEY, hist);
  save(FETCHED_KEY, fetched);
  return hist;
}

/** Ajoute/écrase le cours du jour des titres suivis à partir du flux direct. */
export function recordPrices(quotes: QuoteMap, tickers: string[]): PriceHistory {
  const hist = loadPrices();
  const date = todayISO();
  for (const t of tickers) {
    const q = quotes[t];
    if (!q) continue;
    const series = (hist[t] ?? []).filter((p) => p.date !== date);
    series.push({ date, price: q.price });
    hist[t] = series;
  }
  save(KEY, hist);
  return hist;
}

export function clearPrices(): void {
  save(KEY, {});
  save(FETCHED_KEY, {});
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
