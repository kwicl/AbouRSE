import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeedMode, QuoteMap } from './types';
import { UNIVERSE } from './universe';
import { load, save } from './storage';
import { todayISO } from './format';

const LIVE_POLL_MS = 60_000;
const DEMO_TICK_MS = 4_000;

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

/* ── Flux réel (via proxy /cse configuré dans vite.config.ts) ───────────── */

const num = (v: unknown): number | null => {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.replace(/\s/g, '').replace(',', '.'));
    return isFinite(n) ? n : null;
  }
  return null;
};

/** Parcourt la réponse JSON de la BVC et extrait {symbole, cours, veille}. Tolérant au format. */
function parseCse(json: unknown): QuoteMap {
  const out: QuoteMap = {};
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    const o = node as Record<string, unknown>;
    const sym = [o.ticker, o.symbol, o.field_symbol, o.field_code_soc, o.code].find(
      (v) => typeof v === 'string' && /^[A-Z0-9]{2,6}$/.test(v),
    ) as string | undefined;
    const price = num(o.field_cours_courant ?? o.lastPrice ?? o.price ?? o.cours);
    if (sym && price && price > 0) {
      const varPct = num(o.field_var_veille ?? o.variation ?? o.var);
      const prev = num(o.field_cours_veille ?? o.field_static_reference_price ?? o.prevClose);
      const prevClose = prev ?? (varPct != null ? price / (1 + varPct / 100) : price);
      out[sym] = { ticker: sym, price, prevClose };
    }
    Object.values(o).forEach((v) => typeof v === 'object' && visit(v));
  };
  visit(json);
  return out;
}

async function fetchLive(): Promise<QuoteMap> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch('/cse/dashboard/ticker?marche=59&class%5B%5D=25', { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const quotes = parseCse(await res.json());
    if (Object.keys(quotes).length === 0) throw new Error('Réponse vide');
    return quotes;
  } finally {
    clearTimeout(timer);
  }
}

/* ── Mode démo : marche aléatoire persistée, uniquement pendant la séance ── */

interface DemoState {
  date: string;
  quotes: QuoteMap;
}

const round = (n: number) => Math.round(n * 100) / 100;

function initDemo(extraBases: Record<string, number>): DemoState {
  const stored = load<DemoState | null>('demo-quotes', null);
  const today = todayISO();
  const bases: Record<string, number> = { ...extraBases };
  UNIVERSE.forEach((i) => (bases[i.ticker] = i.ref));

  const quotes: QuoteMap = {};
  for (const [ticker, base] of Object.entries(bases)) {
    const prev = stored?.quotes[ticker];
    if (prev && stored!.date === today) quotes[ticker] = prev;
    else if (prev) quotes[ticker] = { ticker, price: prev.price, prevClose: prev.price };
    else {
      const drift = 1 + (Math.random() - 0.5) * 0.03;
      quotes[ticker] = { ticker, price: round(base * drift), prevClose: base };
    }
  }
  return { date: today, quotes };
}

function tickDemo(state: DemoState): DemoState {
  const quotes: QuoteMap = {};
  for (const [t, q] of Object.entries(state.quotes)) {
    // marche aléatoire avec rappel vers la clôture veille (borne ±6 %)
    const dev = (q.price - q.prevClose) / q.prevClose;
    const step = (Math.random() - 0.5) * 0.004 - dev * 0.02;
    const next = Math.min(Math.max(q.price * (1 + step), q.prevClose * 0.94), q.prevClose * 1.06);
    quotes[t] = { ...q, price: round(next) };
  }
  return { ...state, quotes };
}

/* ── Hook ───────────────────────────────────────────────────────────────── */

export function useMarket(customBases: Record<string, number>) {
  const [mode, setMode] = useState<FeedMode>('demo');
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [open, setOpen] = useState(isMarketOpen());
  const [error, setError] = useState<string | null>(null);
  const demo = useRef<DemoState | null>(null);
  const basesRef = useRef(customBases);
  basesRef.current = customBases;

  const ensureDemo = () => {
    if (!demo.current) demo.current = initDemo(basesRef.current);
    // titres hors univers ajoutés en cours de session
    for (const [t, base] of Object.entries(basesRef.current)) {
      if (!demo.current.quotes[t]) demo.current.quotes[t] = { ticker: t, price: base, prevClose: base };
    }
    return demo.current;
  };

  const publishDemo = useCallback(() => {
    const s = ensureDemo();
    save('demo-quotes', s);
    setQuotes({ ...s.quotes });
    setUpdatedAt(new Date());
  }, []);

  const refresh = useCallback(async () => {
    try {
      const live = await fetchLive();
      // garder les cours démo pour les titres absents du flux
      setQuotes({ ...ensureDemo().quotes, ...live });
      setMode('live');
      setError(null);
      setUpdatedAt(new Date());
    } catch (e) {
      setMode('demo');
      setError(e instanceof Error ? e.message : 'Flux indisponible');
      publishDemo();
    }
  }, [publishDemo]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => {
      const isOpen = isMarketOpen();
      setOpen(isOpen);
      if (mode !== 'demo' || !isOpen) return;
      demo.current = tickDemo(ensureDemo());
      publishDemo();
    }, DEMO_TICK_MS);
    return () => clearInterval(id);
  }, [mode, publishDemo]);

  // nouveaux titres personnalisés : republier la carte démo
  const basesKey = Object.keys(customBases).sort().join(',');
  useEffect(() => {
    if (mode === 'demo' && demo.current) publishDemo();
  }, [basesKey, mode, publishDemo]);

  return { quotes, mode, updatedAt, open, error, refresh };
}
