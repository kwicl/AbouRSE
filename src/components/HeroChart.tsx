import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { DailyPoint, IntradayPoint, Range } from '../lib/types';
import type { Totals } from '../lib/portfolio';
import { fmtMAD, fmtPct, fmtSigned } from '../lib/format';

const RANGES: Range[] = ['1D', '1W', '1M', 'YTD', 'ALL'];

interface Props {
  daily: DailyPoint[];
  intraday: IntradayPoint[];
  totals: Totals;
}

interface Pt {
  t: number;
  roi: number;
  pnl: number;
  value: number;
}

const roiOf = (value: number, invested: number) => (invested ? (value / invested - 1) * 100 : 0);

export function HeroChart({ daily, intraday, totals }: Props) {
  const [range, setRange] = useState<Range>('1M');

  const data: Pt[] = useMemo(() => {
    if (range === '1D') {
      return intraday.map((p) => ({ t: p.t, roi: roiOf(p.value, p.invested), pnl: p.value - p.invested, value: p.value }));
    }
    const now = new Date();
    const from = new Date(now);
    if (range === '1W') from.setDate(now.getDate() - 7);
    else if (range === '1M') from.setMonth(now.getMonth() - 1);
    else if (range === 'YTD') from.setMonth(0, 1);
    else from.setFullYear(1970);
    const fromMs = from.setHours(0, 0, 0, 0);
    return daily
      .map((p) => ({ t: new Date(p.date + 'T12:00:00').getTime(), roi: roiOf(p.value, p.invested), pnl: p.value - p.invested, value: p.value }))
      .filter((p) => p.t >= fromMs);
  }, [range, daily, intraday]);

  // variation sur la période affichée (en points de ROI)
  const first = data[0];
  const last = data[data.length - 1];
  const periodDelta = first && last ? last.roi - first.roi : 0;

  const gain = totals.pnl >= 0;
  const lineUp = (last?.roi ?? totals.pnlPct) >= 0;
  const stroke = lineUp ? '#34d399' : '#fb7185';

  // dégradé partagé à 0 % : vert au-dessus, rouge en dessous (style « baseline »)
  const { min, max } = data.reduce(
    (a, p) => ({ min: Math.min(a.min, p.roi), max: Math.max(a.max, p.roi) }),
    { min: Infinity, max: -Infinity },
  );
  const zeroOff = max <= 0 ? 0 : min >= 0 ? 1 : max / (max - min);
  const pad = Math.max((max - min) * 0.12, 0.25);

  const fmtTick = (t: number) => {
    const d = new Date(t);
    if (range === '1D') return d.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' });
    if (range === 'ALL' || range === 'YTD') return d.toLocaleDateString('fr-MA', { month: 'short', year: '2-digit' });
    return d.toLocaleDateString('fr-MA', { day: '2-digit', month: 'short' });
  };

  return (
    <section className={`neon ${gain ? '' : 'loss'} p-4 sm:p-6`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Plus/Moins-value globale</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <span className="num neon-text text-3xl font-bold sm:text-5xl" style={{ color: `rgb(var(--glow))` }}>
              {fmtSigned(totals.pnl)} <span className="text-lg font-semibold sm:text-2xl">MAD</span>
            </span>
            <span className="badge-glow num inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold">
              {gain ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {fmtPct(totals.pnlPct)}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Valeur <span className="num text-slate-200">{fmtMAD(totals.value)} MAD</span>
            <span className="mx-2 text-slate-700">•</span>
            {range} :{' '}
            <span className={`num ${periodDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {fmtPct(periodDelta)} pts
            </span>
          </p>
        </div>

        <div className="flex self-start rounded-full border border-slate-800 bg-slate-900/70 p-1" role="tablist" aria-label="Période">
          {RANGES.map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={range === r}
              onClick={() => setRange(r)}
              className={`min-w-[2.75rem] rounded-full px-3 py-2 text-xs font-semibold transition sm:py-1 ${
                range === r ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-glow mt-4 h-60 sm:h-80">
        {data.length < 2 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-800 text-sm text-slate-500">
            {range === '1D'
              ? 'La courbe du jour se construit pendant la séance (09:30–15:30).'
              : 'Historique en cours de constitution — revenez demain pour voir la courbe.'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="roiStroke" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={zeroOff} stopColor="#34d399" />
                  <stop offset={zeroOff} stopColor="#fb7185" />
                </linearGradient>
                <linearGradient id="roiFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={0} stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset={zeroOff} stopColor="#34d399" stopOpacity={0.02} />
                  <stop offset={zeroOff} stopColor="#fb7185" stopOpacity={0.02} />
                  <stop offset={1} stopColor="#fb7185" stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1e293b" strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={fmtTick}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={[min - pad, max + pad]}
                tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" />
              <Tooltip
                cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as Pt;
                  const d = new Date(p.t);
                  return (
                    <div className="rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
                      <div className="mb-1 text-slate-400">
                        {range === '1D'
                          ? d.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })
                          : d.toLocaleDateString('fr-MA', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="num flex justify-between gap-4">
                        <span className="text-slate-400">ROI</span>
                        <span className={p.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{fmtPct(p.roi)}</span>
                      </div>
                      <div className="num flex justify-between gap-4">
                        <span className="text-slate-400">P&amp;L</span>
                        <span className="text-slate-100">{fmtSigned(p.pnl)}</span>
                      </div>
                      <div className="num flex justify-between gap-4">
                        <span className="text-slate-400">Valeur</span>
                        <span className="text-slate-100">{fmtMAD(p.value)}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="roi"
                stroke="url(#roiStroke)"
                strokeWidth={2}
                fill="url(#roiFill)"
                baseValue={0}
                isAnimationActive={false}
                activeDot={{ r: 5, fill: stroke, stroke: '#020617', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
