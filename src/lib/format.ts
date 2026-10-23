const mad = new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('fr-MA', { notation: 'compact', maximumFractionDigits: 1 });

export const fmtMAD = (n: number) => mad.format(n);
export const fmtCompact = (n: number) => compact.format(n);
export const fmtSigned = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + mad.format(Math.abs(n));
export const fmtPct = (n: number, digits = 2) =>
  (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(digits).replace('.', ',') + ' %';

export const toneClass = (n: number) =>
  n > 0 ? 'text-emerald-400' : n < 0 ? 'text-rose-400' : 'text-slate-400';

export function todayISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
