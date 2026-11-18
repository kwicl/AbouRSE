import { useMemo, useState } from 'react';
import type { Row } from '../lib/portfolio';
import type { PriceHistory, PricePoint } from '../lib/types';
import { fmtMAD, fmtPct, fmtSigned, todayISO, toneClass } from '../lib/format';

/**
 * Résultats par titre : séance du jour, depuis le début du mois (MTD) et depuis le début de l'année (YTD),
 * puis le détail des dernières séances, titre par titre.
 *
 * Référence d'une période : clôture de la dernière séance avant le 1er du mois / de l'année,
 * ou prix d'achat si la ligne a été achetée pendant la période.
 */

interface Perf {
  pnl: number;
  base: number; // montant de référence (cours de référence × quantité)
}

const pct = (p: Perf) => (p.base ? (p.pnl / p.base) * 100 : 0);

/** dernière clôture strictement avant `date` */
function closeBefore(series: PricePoint[] | undefined, date: string): number | undefined {
  if (!series?.length) return undefined;
  let ans: number | undefined;
  for (const p of series) {
    if (p.date < date) ans = p.price;
    else break;
  }
  return ans;
}

function periodPerf(lots: Row[], series: PricePoint[] | undefined, start: string): Perf {
  return lots.reduce<Perf>(
    (acc, l) => {
      const ref = l.buyDate >= start ? l.buyPrice : (closeBefore(series, start) ?? l.buyPrice);
      return { pnl: acc.pnl + (l.price - ref) * l.qty, base: acc.base + ref * l.qty };
    },
    { pnl: 0, base: 0 },
  );
}

/** résultat d'une séance pour les lignes détenues ce jour-là */
function sessionPerf(lots: Row[], series: PricePoint[], i: number, today: string): Perf | null {
  const d = series[i].date;
  const close = d === today ? lots[0].price : series[i].price;
  const prev = i > 0 ? series[i - 1].price : undefined;
  let held = false;
  const perf = lots.reduce<Perf>(
    (acc, l) => {
      if (l.buyDate > d) return acc;
      const ref = l.buyDate === d ? l.buyPrice : prev;
      if (ref === undefined) return acc;
      held = true;
      return { pnl: acc.pnl + (close - ref) * l.qty, base: acc.base + ref * l.qty };
    },
    { pnl: 0, base: 0 },
  );
  return held ? perf : null;
}

const add = (a: Perf, b: Perf): Perf => ({ pnl: a.pnl + b.pnl, base: a.base + b.base });

function Cell({ p, strong = false }: { p: Perf | null; strong?: boolean }) {
  if (!p) return <td className="px-1.5 py-2.5 text-right text-slate-600 sm:px-2">—</td>;
  return (
    <td className={`whitespace-nowrap px-1.5 py-2.5 text-right sm:px-2 ${toneClass(p.pnl)}`}>
      <div className={strong ? 'font-semibold' : ''}>{fmtSigned(p.pnl)}</div>
      <div className="text-[11px] opacity-80">{fmtPct(pct(p))}</div>
    </td>
  );
}

const SESSIONS = [5, 10, 20] as const;

export function DailyResults({ rows, prices }: { rows: Row[]; prices: PriceHistory }) {
  const [view, setView] = useState<'periodes' | 'seances'>('periodes');
  const [count, setCount] = useState<(typeof SESSIONS)[number]>(10);

  const today = todayISO();
  const monthStart = today.slice(0, 8) + '01';
  const yearStart = today.slice(0, 5) + '01-01';

  // une ligne par titre (plusieurs achats d'un même titre regroupés)
  const groups = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of rows) m.set(r.ticker, [...(m.get(r.ticker) ?? []), r]);
    return [...m.entries()]
      .map(([ticker, lots]) => {
        const series = prices[ticker];
        return {
          ticker,
          name: lots[0].name,
          price: lots[0].price,
          lots,
          day: lots.reduce<Perf>((a, l) => add(a, { pnl: l.dayChange, base: l.prevClose * l.qty }), { pnl: 0, base: 0 }),
          mtd: periodPerf(lots, series, monthStart),
          ytd: periodPerf(lots, series, yearStart),
        };
      })
      .sort((a, b) => b.lots.reduce((s, l) => s + l.value, 0) - a.lots.reduce((s, l) => s + l.value, 0));
  }, [rows, prices, monthStart, yearStart]);

  // dernières séances : dates présentes dans l'historique des titres détenus
  const sessions = useMemo(() => {
    const dates = new Set<string>();
    for (const g of groups) for (const p of prices[g.ticker] ?? []) if (p.date <= today) dates.add(p.date);
    return [...dates].sort().reverse().slice(0, count);
  }, [groups, prices, today, count]);

  const grid = useMemo(
    () =>
      sessions.map((d) => {
        const cells = groups.map((g) => {
          const series = prices[g.ticker] ?? [];
          const i = series.findIndex((p) => p.date === d);
          return i < 0 ? null : sessionPerf(g.lots, series, i, today);
        });
        const total = cells.reduce<Perf | null>((a, c) => (c ? add(a ?? { pnl: 0, base: 0 }, c) : a), null);
        return { date: d, cells, total };
      }),
    [sessions, groups, prices, today],
  );

  if (rows.length === 0) return null;

  const tot = (k: 'day' | 'mtd' | 'ytd') => groups.reduce<Perf>((a, g) => add(a, g[k]), { pnl: 0, base: 0 });
  const month = new Date().toLocaleDateString('fr-MA', { month: 'long' });
  const fmtDay = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('fr-MA', { weekday: 'short', day: '2-digit', month: 'short' });

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Résultats par titre</h2>
          <p className="text-xs text-slate-500">
            {view === 'periodes'
              ? `Séance du jour, depuis le 1er ${month} et depuis le 1er janvier • en MAD`
              : 'Résultat de chaque séance, titre par titre • en MAD'}
          </p>
        </div>
        <div className="flex gap-1 rounded-full border border-slate-700 p-0.5 text-xs">
          {(
            [
              ['periodes', 'Jour / Mois / Année'],
              ['seances', 'Séance par séance'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={`rounded-full px-3 py-1 font-semibold transition ${view === k ? 'bg-slate-100 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'periodes' ? (
        <div className="overflow-x-auto border-t border-slate-800 px-2 pb-4 sm:px-4">
          <table className="num w-full text-xs sm:min-w-[34rem] sm:text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-slate-500">
                <th className="py-3 pr-1 text-left sm:pr-3 font-medium">Titre</th>
                <th className="hidden px-2 py-3 text-right font-medium sm:table-cell">Cours</th>
                <th className="px-2 py-3 text-right font-medium">
                  Jour
                  {/* avant la première cotation du jour, le flux donne encore la dernière séance */}
                  {sessions[0] && sessions[0] !== today && (
                    <div className="font-sans text-[10px] normal-case tracking-normal text-slate-500">{fmtDay(sessions[0])}</div>
                  )}
                </th>
                <th className="px-2 py-3 text-right font-medium">Mois<span className="hidden sm:inline"> (MTD)</span></th>
                <th className="py-3 pl-2 text-right font-medium">Année<span className="hidden sm:inline"> (YTD)</span></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.ticker} className="border-t border-slate-800/70">
                  <td className="py-2.5 pr-1 sm:pr-3">
                    <div className="font-semibold text-slate-100">{g.ticker}</div>
                    <div className="max-w-[4.5rem] truncate font-sans text-[11px] sm:max-w-[9rem] text-slate-500">{g.name}</div>
                  </td>
                  <td className="hidden px-2 py-2.5 text-right text-slate-100 sm:table-cell">{fmtMAD(g.price)}</td>
                  <Cell p={g.day} />
                  <Cell p={g.mtd} />
                  <Cell p={g.ytd} />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-700">
                <td className="py-2.5 pr-3 font-semibold text-slate-300 sm:hidden">
                  Total
                </td>
                <td className="hidden py-2.5 pr-3 font-semibold text-slate-300 sm:table-cell" colSpan={2}>
                  Portefeuille
                </td>
                <Cell p={tot('day')} strong />
                <Cell p={tot('mtd')} strong />
                <Cell p={tot('ytd')} strong />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="border-t border-slate-800 px-4 pb-4">
          <div className="flex justify-end gap-1 pt-3">
            {SESSIONS.map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`rounded-md px-2 py-1 text-xs transition ${count === n ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-200'}`}
              >
                {n} séances
              </button>
            ))}
          </div>
          {grid.length === 0 ? (
            <div className="mt-3 flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-800 text-sm text-slate-500">
              Historique en cours de chargement…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="num w-full text-sm" style={{ minWidth: `${8 + groups.length * 6.5 + 7}rem` }}>
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-slate-500">
                    <th className="sticky left-0 py-3 pr-3 text-left font-medium">Séance</th>
                    {groups.map((g) => (
                      <th key={g.ticker} className="px-2 py-3 text-right font-medium">
                        {g.ticker}
                      </th>
                    ))}
                    <th className="py-3 pl-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {grid.map((r) => (
                    <tr key={r.date} className="border-t border-slate-800/70">
                      <td className="whitespace-nowrap py-2.5 pr-3 font-sans text-slate-300">
                        {r.date === today ? "Aujourd'hui" : fmtDay(r.date)}
                      </td>
                      {r.cells.map((c, i) => (
                        <Cell key={groups[i].ticker} p={c} />
                      ))}
                      <Cell p={r.total} strong />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-[11px] text-slate-500">
            Séance = clôture du jour moins clôture de la veille (ou prix d'achat le jour de l'achat), × quantité détenue.
          </p>
        </div>
      )}
    </section>
  );
}
