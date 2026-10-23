import { useCallback, useEffect, useState } from 'react';
import type { FeedMode, QuoteMap } from './types';
import { UNIVERSE_MAP } from './universe';
import { load, save } from './storage';

const POLL_OPEN_MS = 30_000;
const POLL_CLOSED_MS = 5 * 60_000;

/** Séance BVC : lundi–vendredi, 09:30–15:30 (heure de Casablanca) */
export function isMarketOpen(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Casablanca',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  if (get('weekday') === 'Sat' || get('weekday') === 'Sun') return false;
  const mins = Number(get('hour')) * 60 + Number(get('minute'));
  return mins >= 9 * 60 + 30 && mins <= 15 * 60 + 30;
}

interface Snapshot {
  quotes: QuoteMap;
  /** retard du flux en minutes (15 pour la BVC) */
  delayMinutes: number;
  fetchedAt: number;
}

export async function fetchQuotes(): Promise<Snapshot> {
  const res = await fetch('/api/quotes', { cache: 'no-store' });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    delayMinutes?: number;
    at?: number;
    quotes?: { ticker: string; name: string; price: number; prevClose: number }[];
  };
  if (!res.ok || !body.quotes?.length) throw new Error(body.error ?? `HTTP ${res.status}`);

  const quotes: QuoteMap = {};
  for (const q of body.quotes) {
    const known = UNIVERSE_MAP[q.ticker];
    quotes[q.ticker] = { ticker: q.ticker, name: known?.name ?? q.name, price: q.price, prevClose: q.prevClose || q.price };
  }
  return { quotes, delayMinutes: body.delayMinutes ?? 15, fetchedAt: body.at ?? Date.now() };
}

export function useMarket() {
  const cached = load<Snapshot | null>('last-quotes', null);
  const [snap, setSnap] = useState<Snapshot | null>(cached);
  const [mode, setMode] = useState<FeedMode>(cached ? 'cache' : 'loading');
  const [open, setOpen] = useState(isMarketOpen());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setOpen(isMarketOpen());
    try {
      const s = await fetchQuotes();
      save('last-quotes', s);
      setSnap(s);
      setMode('live');
      setError(null);
    } catch (e) {
      // repli : derniers cours réels connus (jamais de cours inventés)
      setMode((m) => (m === 'loading' && !load('last-quotes', null) ? 'error' : 'cache'));
      setError(e instanceof Error ? e.message : 'Flux indisponible');
    }
  }, []);

  // à chaque ouverture / retour sur l'app : cours frais, puis rafraîchissement régulier
  useEffect(() => {
    void refresh();
    let id = setInterval(() => void refresh(), isMarketOpen() ? POLL_OPEN_MS : POLL_CLOSED_MS);
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void refresh();
      clearInterval(id);
      id = setInterval(() => void refresh(), isMarketOpen() ? POLL_OPEN_MS : POLL_CLOSED_MS);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [refresh]);

  return {
    quotes: snap?.quotes ?? {},
    mode,
    open,
    error,
    refresh,
    updatedAt: snap ? new Date(snap.fetchedAt) : null,
    fetchedAt: snap ? snap.fetchedAt : null,
    delayMinutes: snap?.delayMinutes ?? 15,
  };
}
