import type { ReactNode } from 'react';
import { BadgeCheck, CalendarClock, Landmark, PiggyBank, Wallet } from 'lucide-react';
import type { Totals } from '../lib/portfolio';
import { fmtMAD, fmtPct, fmtSigned, toneClass } from '../lib/format';
import { CountUp } from './ui/CountUp';

function Card({ icon, label, value, format, sub, tone, className = '' }: { icon: ReactNode; label: string; value: number; format: (n: number) => string; sub?: string; tone?: string; className?: string }) {
  return (
    <div data-enter className={`glass p-4 ${className}`}>
      <div className="metric-label flex items-center gap-2 text-xs font-semibold text-slate-400">
        <span className="metric-icon grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-300">{icon}</span>
        {label}
      </div>
      <div className={`num mt-2 text-lg font-extrabold tracking-tight sm:text-xl ${tone ?? 'text-slate-50'}`}>
        <CountUp value={value} format={format} /> MAD
      </div>
      {sub && <div className={`num mt-0.5 text-xs ${tone ?? 'text-slate-500'}`}>{sub}</div>}
    </div>
  );
}

export function Metrics({ t, realized, soldCost }: { t: Totals; realized: number; soldCost: number }) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Card className="metric-lead" icon={<Wallet className="h-4 w-4" />} label="Valeur du portefeuille" value={t.value} format={fmtMAD} />
      <Card icon={<PiggyBank className="h-4 w-4" />} label="Montant investi" value={t.invested} format={fmtMAD} />
      <Card
        icon={<Landmark className="h-4 w-4" />}
        label="Plus/moins-value latente"
        value={t.pnl}
        format={fmtSigned}
        sub={fmtPct(t.pnlPct)}
        tone={toneClass(t.pnl)}
      />
      <Card
        icon={<CalendarClock className="h-4 w-4" />}
        label="Variation du jour"
        value={t.dayChange}
        format={fmtSigned}
        sub={fmtPct(t.dayPct)}
        tone={toneClass(t.dayChange)}
      />
      <Card
        className="col-span-2 lg:col-span-1"
        icon={<BadgeCheck className="h-4 w-4" />}
        label="Plus/moins-value réalisée"
        value={realized}
        format={fmtSigned}
        sub={soldCost ? fmtPct((realized / soldCost) * 100) : 'Aucune vente'}
        tone={soldCost ? toneClass(realized) : undefined}
      />
    </section>
  );
}
