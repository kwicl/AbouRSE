import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, RefreshCw, Search } from 'lucide-react';
import { UNIVERSE } from '../lib/universe';
import type { FeedMode, QuoteMap } from '../lib/types';
import { fmtMAD, fmtPct, toneClass } from '../lib/format';

interface Props {
  quotes: QuoteMap;
  mode: FeedMode;
  open: boolean;
  updatedAt: Date | null;
  error: string | null;
  onRefresh: () => void;
  onPick: (ticker: string) => void;
}

export function TopBar({ quotes, mode, open, updatedAt, error, onRefresh, onPick }: Props) {
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return UNIVERSE.slice(0, 8);
    return UNIVERSE.filter(
      (i) => i.ticker.toLowerCase().includes(s) || i.name.toLowerCase().includes(s) || i.sector.toLowerCase().includes(s),
    ).slice(0, 8);
  }, [q]);

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setFocus(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (t: string) => {
    onPick(t);
    setQ('');
    setFocus(false);
  };

  const time = updatedAt
    ? updatedAt.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-5">
        <a href="/" className="flex shrink-0 items-center gap-2.5">
          <img
            src="/avatar.png"
            alt="AbouRSE"
            className="h-9 w-9 rounded-full object-cover ring-2 ring-emerald-400/60 shadow-[0_0_14px_rgba(52,211,153,0.45)]"
          />
          <span className="text-lg font-extrabold tracking-tight">
            Abou<span className="text-emerald-400">RSE</span>
          </span>
        </a>

        <div ref={box} className="relative order-3 w-full sm:order-none sm:max-w-md sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocus(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, results.length - 1));
              else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
              else if (e.key === 'Enter' && results[active]) pick(results[active].ticker);
              else if (e.key === 'Escape') setFocus(false);
            }}
            placeholder="Rechercher un titre BVC (IAM, TGCC, SGTM…)"
            enterKeyHint="search"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-full border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
          />
          {focus && results.length > 0 && (
            <ul className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur">
              {results.map((i, idx) => {
                const quote = quotes[i.ticker];
                const ch = quote ? ((quote.price - quote.prevClose) / quote.prevClose) * 100 : 0;
                return (
                  <li key={i.ticker}>
                    <button
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => pick(i.ticker)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${idx === active ? 'bg-slate-800/80' : ''}`}
                    >
                      <span className="w-12 font-semibold text-slate-100">{i.ticker}</span>
                      <span className="flex-1 truncate text-slate-400">{i.name}</span>
                      {quote && (
                        <span className="num text-right text-xs">
                          <span className="text-slate-200">{fmtMAD(quote.price)}</span>{' '}
                          <span className={toneClass(ch)}>{fmtPct(ch)}</span>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs sm:gap-3">
          <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 font-semibold text-slate-300">MAD</span>
          <span
            title={mode === 'live' ? 'Flux Bourse de Casablanca' : `Flux réel indisponible (${error ?? '—'}) : cours simulés`}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 font-semibold ${
              mode === 'live' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${mode === 'live' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {mode === 'live' ? 'LIVE' : 'DÉMO'}
          </span>
          <span className={`hidden rounded-md px-2 py-1 md:inline ${open ? 'text-emerald-300' : 'text-slate-500'}`}>
            {open ? 'Séance ouverte' : 'Marché fermé'}
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            <span className="num">{time}</span>
          </span>
          <button
            onClick={onRefresh}
            aria-label="Actualiser les cours"
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
