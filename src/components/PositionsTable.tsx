import { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, HandCoins, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Row } from '../lib/portfolio';
import type { PriceHistory } from '../lib/types';
import { fmtMAD, fmtPct, fmtSigned, toneClass } from '../lib/format';
import { Sparkline, holdingSeries } from './Sparkline';

interface Props {
  rows: Row[];
  prices: PriceHistory;
  realized: Record<string, number>;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onSell: (id: string) => void;
  onDelete: (id: string) => void;
}

type SortKey = 'ticker' | 'value' | 'pnl' | 'dayPct' | 'realized';

interface Actions {
  onEdit: () => void;
  onSell: () => void;
  onDelete: () => void;
}

const GRID = 'lg:grid lg:grid-cols-[minmax(10rem,1.5fr)_repeat(8,minmax(0,1fr))_6.5rem] lg:items-center';

/** Flash vert/rouge quand le cours change */
function useFlash(price: number) {
  const prev = useRef(price);
  const [cls, setCls] = useState('');
  useEffect(() => {
    if (price !== prev.current) {
      setCls(price > prev.current ? 'flash-up' : 'flash-down');
      prev.current = price;
      const id = setTimeout(() => setCls(''), 900);
      return () => clearTimeout(id);
    }
  }, [price]);
  return cls;
}

function Variation({ v }: { v: number }) {
  const Icon = v >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`num inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold ${
        v > 0 ? 'bg-emerald-500/10 text-emerald-400' : v < 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'
      }`}
    >
      <Icon className="h-3 w-3" />
      {fmtPct(v)}
    </span>
  );
}

function ActionButtons({ r, onEdit, onSell, onDelete }: Actions & { r: Row }) {
  const btn = 'rounded-md p-2 text-slate-400 transition';
  return (
    <div className="flex justify-end gap-0.5">
      <button onClick={onSell} aria-label={`Vendre ${r.ticker}`} title="Vendre" className={`${btn} hover:bg-sky-500/10 hover:text-sky-400`}>
        <HandCoins className="h-4 w-4" />
      </button>
      <button onClick={onEdit} aria-label={`Modifier ${r.ticker}`} title="Modifier" className={`${btn} hover:bg-slate-800 hover:text-slate-100`}>
        <Pencil className="h-4 w-4" />
      </button>
      <button onClick={onDelete} aria-label={`Supprimer ${r.ticker}`} title="Supprimer" className={`${btn} hover:bg-rose-500/10 hover:text-rose-400`}>
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function Realized({ v }: { v: number }) {
  if (!v) return <span className="text-slate-600">—</span>;
  return <span className={`font-semibold ${toneClass(v)}`}>{fmtSigned(v)}</span>;
}

function DesktopRow({ r, series, realized, ...a }: Actions & { r: Row; series: ReturnType<typeof holdingSeries>; realized: number }) {
  const flash = useFlash(r.price);
  return (
    <div role="row" className={`group relative overflow-hidden border-t border-slate-800/70 transition hover:bg-slate-900/60 ${GRID} ${flash}`}>
      {/* évolution du cours depuis l'achat, en arrière-plan de la ligne */}
      <Sparkline points={series} baseline={r.buyPrice} className="absolute inset-0 h-full w-full opacity-70 transition group-hover:opacity-100" />
      <div role="cell" className="relative py-3 pl-4 pr-3">
        <div className="font-semibold text-slate-100">{r.ticker}</div>
        <div className="truncate text-xs text-slate-500">{r.name}</div>
      </div>
      <div role="cell" className="num relative px-3 text-right text-slate-300">{fmtMAD(r.buyPrice)}</div>
      <div role="cell" className="num relative px-3 text-right text-slate-300">{r.qty.toLocaleString('fr-MA')}</div>
      <div role="cell" className="num relative px-3 text-right text-slate-300">{fmtMAD(r.invested)}</div>
      <div role="cell" className="num relative px-3 text-right font-semibold text-slate-100">{fmtMAD(r.price)}</div>
      <div role="cell" className="num relative px-3 text-right text-slate-100">{fmtMAD(r.value)}</div>
      <div role="cell" className={`num relative px-3 text-right ${toneClass(r.pnl)}`}>
        <div className="font-semibold">{fmtSigned(r.pnl)}</div>
        <div className="text-xs opacity-80">{fmtPct(r.pnlPct)}</div>
      </div>
      <div role="cell" className="num relative px-3 text-right">
        <Realized v={realized} />
      </div>
      <div role="cell" className="relative px-3 text-right">
        <Variation v={r.dayPct} />
      </div>
      <div role="cell" className="relative py-2 pr-3">
        <ActionButtons r={r} {...a} />
      </div>
    </div>
  );
}

function MobileCard({ r, series, realized, ...a }: Actions & { r: Row; series: ReturnType<typeof holdingSeries>; realized: number }) {
  const flash = useFlash(r.price);
  return (
    <li className={`overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 ${flash}`}>
      <div className="relative px-4 pb-3 pt-4">
        <Sparkline points={series} baseline={r.buyPrice} className="absolute inset-x-0 bottom-0 top-6 h-[calc(100%-1.5rem)] w-full opacity-60" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold text-slate-100">{r.ticker}</div>
            <div className="truncate text-xs text-slate-500">{r.name}</div>
          </div>
          <div className="text-right">
            <div className="num font-semibold text-slate-100">{fmtMAD(r.price)}</div>
            <Variation v={r.dayPct} />
          </div>
        </div>
        <div className="relative mt-6 flex items-end justify-between text-xs">
          <span className="text-slate-500">depuis achat</span>
          <span className={`num font-semibold ${toneClass(r.pnl)}`}>
            {fmtSigned(r.pnl)} ({fmtPct(r.pnlPct)})
          </span>
        </div>
      </div>
      <dl className="num grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-slate-800/70 px-4 py-3 text-xs">
        <dt className="text-slate-500">Quantité</dt>
        <dd className="text-right text-slate-300">{r.qty.toLocaleString('fr-MA')}</dd>
        <dt className="text-slate-500">PRU</dt>
        <dd className="text-right text-slate-300">{fmtMAD(r.buyPrice)}</dd>
        <dt className="text-slate-500">Investi</dt>
        <dd className="text-right text-slate-300">{fmtMAD(r.invested)}</dd>
        <dt className="text-slate-500">Valeur</dt>
        <dd className="text-right text-slate-100">{fmtMAD(r.value)}</dd>
        <dt className="text-slate-500">+/- value réalisée</dt>
        <dd className="text-right">
          <Realized v={realized} />
        </dd>
      </dl>
      <div className="border-t border-slate-800 px-2 py-1">
        <ActionButtons r={r} {...a} />
      </div>
    </li>
  );
}

export function PositionsTable({ rows, prices, realized, onAdd, onEdit, onSell, onDelete }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'value', dir: -1 });

  const keyOf = (r: Row, k: SortKey) => (k === 'realized' ? (realized[r.ticker] ?? 0) : r[k]);
  const sorted = [...rows].sort((a, b) => {
    const va = keyOf(a, sort.key);
    const vb = keyOf(b, sort.key);
    return (typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)) * sort.dir;
  });

  const toggle = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : key === 'ticker' ? 1 : -1 }));

  const th = (label: string, key?: SortKey, align = 'text-right') => (
    <div role="columnheader" className={`whitespace-nowrap px-3 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 ${align}`}>
      {key ? (
        <button onClick={() => toggle(key)} className={`uppercase hover:text-slate-200 ${sort.key === key ? 'text-slate-200' : ''}`}>
          {label}
          {sort.key === key ? (sort.dir === -1 ? ' ↓' : ' ↑') : ''}
        </button>
      ) : (
        label
      )}
    </div>
  );

  const actions = (id: string): Actions => ({ onEdit: () => onEdit(id), onSell: () => onSell(id), onDelete: () => onDelete(id) });

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40">
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Positions</h2>
          <p className="text-xs text-slate-500">
            {rows.length} ligne{rows.length > 1 ? 's' : ''} • cours en MAD • courbe = évolution depuis l'achat
          </p>
        </div>
        <button
          onClick={onAdd}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.45)] transition hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="border-t border-slate-800 px-4 py-12 text-center text-sm text-slate-500">
          Aucune position. Ajoutez votre premier titre ou utilisez la recherche.
        </div>
      ) : (
        <>
          <div role="table" className="hidden text-sm lg:block">
            <div role="row" className={GRID}>
              {th('Titre', 'ticker', 'text-left pl-4')}
              {th('PRU')}
              {th('Qté')}
              {th('Investi')}
              {th('Cours')}
              {th('Valeur', 'value')}
              {th('Latente', 'pnl')}
              {th('Réalisée', 'realized')}
              {th('Var. jour', 'dayPct')}
              <div />
            </div>
            {sorted.map((r) => (
              <DesktopRow key={r.id} r={r} series={holdingSeries(prices[r.ticker], r.buyDate)} realized={realized[r.ticker] ?? 0} {...actions(r.id)} />
            ))}
          </div>
          <ul className="space-y-3 border-t border-slate-800 p-3 lg:hidden">
            {sorted.map((r) => (
              <MobileCard key={r.id} r={r} series={holdingSeries(prices[r.ticker], r.buyDate)} realized={realized[r.ticker] ?? 0} {...actions(r.id)} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
