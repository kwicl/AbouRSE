import { useEffect, useMemo, useRef, useState } from 'react';
import type { Row } from '../lib/portfolio';
import type { PriceHistory, PricePoint } from '../lib/types';
import { fmtMAD, fmtPct, fmtSigned, toneClass } from '../lib/format';

const GREEN = '#34d399';
const RED = '#fb7185';
const AMBER = '#fbbf24';

type RangeKey = '1M' | '3M' | '6M' | '1A' | 'ACHAT';
const RANGES: { key: RangeKey; label: string }[] = [
  { key: '1M', label: '1M' },
  { key: '3M', label: '3M' },
  { key: '6M', label: '6M' },
  { key: '1A', label: '1A' },
  { key: 'ACHAT', label: 'Depuis achat' },
];

interface Candle {
  date: string;
  o: number;
  h: number;
  l: number;
  c: number;
}

function toCandles(points: PricePoint[]): Candle[] {
  return points.map((p, i) => {
    const o = p.o ?? points[i - 1]?.price ?? p.price;
    return { date: p.date, o, h: Math.max(p.h ?? p.price, o, p.price), l: Math.min(p.l ?? p.price, o, p.price), c: p.price };
  });
}

/** Regroupe les bougies par paquets (ex. semaines) quand il y en a trop pour l'écran */
function aggregate(cs: Candle[], size: number): Candle[] {
  if (size <= 1) return cs;
  const out: Candle[] = [];
  for (let i = 0; i < cs.length; i += size) {
    const g = cs.slice(i, i + size);
    out.push({
      date: g[g.length - 1].date,
      o: g[0].o,
      h: Math.max(...g.map((x) => x.h)),
      l: Math.min(...g.map((x) => x.l)),
      c: g[g.length - 1].c,
    });
  }
  return out;
}

function cutoffISO(range: RangeKey, buyDate: string): string {
  if (range === 'ACHAT') return buyDate;
  const d = new Date();
  if (range === '1M') d.setMonth(d.getMonth() - 1);
  else if (range === '3M') d.setMonth(d.getMonth() - 3);
  else if (range === '6M') d.setMonth(d.getMonth() - 6);
  else d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

const fmtDate = (iso: string, long: boolean) => {
  const [y, m, d] = iso.split('-');
  return long ? `${m}/${y.slice(2)}` : `${d}/${m}`;
};

function CandleChart({ candles, buyPrice, lastPrice }: { candles: Candle[]; buyPrice: number; lastPrice: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 600));
    ro.observe(el);
    setW(el.clientWidth || 600);
    return () => ro.disconnect();
  }, []);

  const H = w < 480 ? 260 : 340;
  const M = { t: 10, r: 58, b: 24, l: 6 };
  const iw = Math.max(50, w - M.l - M.r);
  const ih = H - M.t - M.b;

  const maxBars = Math.max(20, Math.floor(iw / 6));
  const size = Math.ceil(candles.length / maxBars);
  const cs = useMemo(() => aggregate(candles, size), [candles, size]);

  const lo0 = Math.min(...cs.map((c) => c.l), buyPrice);
  const hi0 = Math.max(...cs.map((c) => c.h), buyPrice);
  const pad = (hi0 - lo0 || hi0 * 0.05 || 1) * 0.06;
  const lo = lo0 - pad;
  const hi = hi0 + pad;
  const y = (v: number) => M.t + ih - ((v - lo) / (hi - lo)) * ih;
  const step = iw / cs.length;
  const x = (i: number) => M.l + step * (i + 0.5);
  const bw = Math.max(1.5, Math.min(14, step * 0.68));

  const ticks = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4);
  const long = cs.length > 1 && new Date(cs[cs.length - 1].date).getTime() - new Date(cs[0].date).getTime() > 400 * 86400000;
  const labelIdx = cs.length < 2 ? [0] : [0, 0.33, 0.66, 1].map((f) => Math.round(f * (cs.length - 1)));

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - r.left - M.l) / step);
    setHover(i >= 0 && i < cs.length ? i : null);
  };

  const shown = cs[hover ?? cs.length - 1];
  const up = lastPrice >= buyPrice;

  return (
    <div ref={wrap} className="w-full">
      <div className="num mb-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 px-1 text-xs text-slate-400">
        <span className="text-slate-500">{shown ? fmtDate(shown.date, false) + '/' + shown.date.slice(0, 4) : ''}</span>
        {shown && (
          <>
            <span>O <b className="font-semibold text-slate-200">{fmtMAD(shown.o)}</b></span>
            <span>H <b className="font-semibold text-slate-200">{fmtMAD(shown.h)}</b></span>
            <span>B <b className="font-semibold text-slate-200">{fmtMAD(shown.l)}</b></span>
            <span>C <b className={`font-semibold ${shown.c >= shown.o ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtMAD(shown.c)}</b></span>
            {size > 1 && <span className="text-slate-600">bougies de {size} séances</span>}
          </>
        )}
      </div>
      <svg width={w} height={H} onPointerMove={onMove} onPointerLeave={() => setHover(null)} className="touch-pan-y select-none">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={M.l + iw} y1={y(t)} y2={y(t)} stroke="#1e293b" strokeWidth={1} />
            <text x={M.l + iw + 6} y={y(t) + 4} fontSize={10.5} fill="#64748b" className="num">{fmtMAD(t)}</text>
          </g>
        ))}
        {labelIdx.map((i, k) => (
          <text key={k} x={x(i)} y={H - 6} fontSize={10.5} fill="#64748b" textAnchor={k === 0 ? 'start' : k === labelIdx.length - 1 ? 'end' : 'middle'}>
            {fmtDate(cs[i].date, long)}
          </text>
        ))}

        {/* prix d'achat */}
        <line x1={M.l} x2={M.l + iw} y1={y(buyPrice)} y2={y(buyPrice)} stroke={AMBER} strokeDasharray="5 4" strokeWidth={1.2} />
        <rect x={M.l + iw + 1} y={y(buyPrice) - 8} width={M.r - 2} height={16} rx={3} fill={AMBER} />
        <text x={M.l + iw + 5} y={y(buyPrice) + 4} fontSize={10.5} fill="#0f172a" fontWeight={700} className="num">{fmtMAD(buyPrice)}</text>

        {cs.map((c, i) => {
          const col = c.c >= c.o ? GREEN : RED;
          const top = y(Math.max(c.o, c.c));
          const bot = y(Math.min(c.o, c.c));
          return (
            <g key={c.date + i} opacity={hover === null || hover === i ? 1 : 0.55}>
              <line x1={x(i)} x2={x(i)} y1={y(c.h)} y2={y(c.l)} stroke={col} strokeWidth={1.2} />
              <rect x={x(i) - bw / 2} y={top} width={bw} height={Math.max(1, bot - top)} fill={col} />
            </g>
          );
        })}

        {/* dernier cours */}
        <line x1={M.l} x2={M.l + iw} y1={y(lastPrice)} y2={y(lastPrice)} stroke={up ? GREEN : RED} strokeWidth={1} strokeOpacity={0.6} />
        <rect x={M.l + iw + 1} y={y(lastPrice) - 8} width={M.r - 2} height={16} rx={3} fill={up ? GREEN : RED} />
        <text x={M.l + iw + 5} y={y(lastPrice) + 4} fontSize={10.5} fill="#0f172a" fontWeight={700} className="num">{fmtMAD(lastPrice)}</text>

        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={M.t + ih} stroke="#94a3b8" strokeDasharray="3 3" strokeOpacity={0.6} />}
      </svg>
    </div>
  );
}

export function PnlBreakdown({ rows, prices }: { rows: Row[]; prices: PriceHistory }) {
  const sorted = useMemo(() => [...rows].sort((a, b) => b.pnl - a.pnl), [rows]);
  const [sel, setSel] = useState<string>();
  const [range, setRange] = useState<RangeKey>('3M');
  if (rows.length === 0) return null;

  const total = rows.reduce((s, r) => s + r.pnl, 0);
  const row = sorted.find((r) => r.ticker === sel) ?? sorted[0];
  const series = prices[row.ticker] ?? [];
  const from = cutoffISO(range, row.buyDate);
  const candles = toCandles(series.filter((p) => p.date >= from));

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Plus/moins-value par titre</h2>
          <p className="text-xs text-slate-500">Cours actuel vs prix d'achat (PRU) • en MAD • ligne jaune = prix d'achat</p>
        </div>
        <div className={`num text-right text-sm font-semibold ${toneClass(total)}`}>
          {fmtSigned(total)} MAD
          <div className="text-[11px] font-normal text-slate-500">total latent</div>
        </div>
      </div>

      <div className="border-t border-slate-800 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {sorted.map((r) => (
              <button
                key={r.id}
                onClick={() => setSel(r.ticker)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  r.ticker === row.ticker ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300' : 'border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {r.ticker}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-md px-2 py-1 text-xs transition ${range === r.key ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-200'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="num mb-2 flex flex-wrap items-baseline gap-x-3 px-1">
          <span className="text-lg font-semibold text-slate-100">{row.ticker}</span>
          <span className="text-lg text-slate-100">{fmtMAD(row.price)}</span>
          <span className={`text-sm font-semibold ${toneClass(row.pnl)}`}>
            {fmtSigned(row.pnl)} MAD ({fmtPct(row.pnlPct)})
          </span>
          <span className="text-xs text-slate-500">vs achat {fmtMAD(row.buyPrice)}</span>
        </div>

        {candles.length >= 2 ? (
          <CandleChart candles={candles} buyPrice={row.buyPrice} lastPrice={row.price} />
        ) : (
          <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-800 text-sm text-slate-500">
            Historique en cours de chargement…
          </div>
        )}
      </div>

      <div className="overflow-x-auto border-t border-slate-800 px-4 pb-4">
        <table className="num w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-slate-500">
              <th className="py-3 pr-3 text-left font-medium">Titre</th>
              <th className="px-2 py-3 text-right font-medium">Qté</th>
              <th className="px-2 py-3 text-right font-medium">Achat</th>
              <th className="px-2 py-3 text-right font-medium">Cours</th>
              <th className="px-2 py-3 text-right font-medium">Investi</th>
              <th className="px-2 py-3 text-right font-medium">Valeur</th>
              <th className="px-2 py-3 text-right font-medium">+/- value</th>
              <th className="py-3 pl-2 text-right font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.id}
                onClick={() => setSel(r.ticker)}
                className={`cursor-pointer border-t border-slate-800/70 transition hover:bg-slate-900/60 ${r.ticker === row.ticker ? 'bg-slate-900/70' : ''}`}
              >
                <td className="py-2.5 pr-3 font-semibold text-slate-100">{r.ticker}</td>
                <td className="px-2 py-2.5 text-right text-slate-300">{r.qty.toLocaleString('fr-MA')}</td>
                <td className="px-2 py-2.5 text-right text-slate-300">{fmtMAD(r.buyPrice)}</td>
                <td className="px-2 py-2.5 text-right text-slate-100">{fmtMAD(r.price)}</td>
                <td className="px-2 py-2.5 text-right text-slate-300">{fmtMAD(r.invested)}</td>
                <td className="px-2 py-2.5 text-right text-slate-100">{fmtMAD(r.value)}</td>
                <td className={`px-2 py-2.5 text-right font-semibold ${toneClass(r.pnl)}`}>{fmtSigned(r.pnl)}</td>
                <td className={`py-2.5 pl-2 text-right ${toneClass(r.pnl)}`}>{fmtPct(r.pnlPct)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-700 font-semibold">
              <td className="py-2.5 pr-3 text-slate-300" colSpan={4}>Total</td>
              <td className="px-2 py-2.5 text-right text-slate-300">{fmtMAD(rows.reduce((s, r) => s + r.invested, 0))}</td>
              <td className="px-2 py-2.5 text-right text-slate-100">{fmtMAD(rows.reduce((s, r) => s + r.value, 0))}</td>
              <td className={`px-2 py-2.5 text-right ${toneClass(total)}`}>{fmtSigned(total)}</td>
              <td className="py-2.5 pl-2" />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
