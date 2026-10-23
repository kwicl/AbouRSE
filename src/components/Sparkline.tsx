import { useId } from 'react';
import type { PricePoint } from '../lib/types';

interface Props {
  points: PricePoint[];
  /** prix de revient : ligne pointillée de référence */
  baseline?: number;
  className?: string;
}

/** Mini-graphe d'évolution du cours, conçu pour être posé en arrière-plan d'une ligne. */
export function Sparkline({ points, baseline, className = '' }: Props) {
  const id = useId();
  if (points.length < 2) return null;

  const prices = points.map((p) => p.price);
  const lo = Math.min(...prices, baseline ?? Infinity);
  const hi = Math.max(...prices, baseline ?? -Infinity);
  const span = hi - lo || 1;
  const W = 100;
  const H = 40;
  // marge verticale pour que la courbe ne touche pas les bords de la ligne
  const y = (v: number) => H - 4 - ((v - lo) / span) * (H - 8);
  const x = (i: number) => (i / (points.length - 1)) * W;

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(p.price).toFixed(2)}`).join('');
  const area = `${line}L${W},${H}L0,${H}Z`;
  const up = prices[prices.length - 1] >= (baseline ?? prices[0]);
  const color = up ? '#34d399' : '#fb7185';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={`pointer-events-none ${className}`} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      {baseline != null && (
        <line x1="0" x2={W} y1={y(baseline)} y2={y(baseline)} stroke="#94a3b8" strokeOpacity="0.35" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      )}
      <path d={line} fill="none" stroke={color} strokeOpacity="0.75" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/** Points à afficher : depuis la date d'achat (au moins 30 séances si l'achat est récent). */
export function holdingSeries(series: PricePoint[] | undefined, buyDate: string): PricePoint[] {
  if (!series?.length) return [];
  const since = series.filter((p) => p.date >= buyDate);
  return since.length >= 30 ? since : series.slice(-30);
}
