import type { ReactNode } from 'react';
import { BadgeCheck, CalendarClock, Landmark, PiggyBank, Wallet } from 'lucide-react';
import type { Totals } from '../lib/portfolio';
import { fmtMAD, fmtPct, fmtSigned, toneClass } from '../lib/format';

function Card({ icon, label, value, sub, tone, className = '' }: { icon: ReactNode; label: string; value: string; sub?: string; tone?: string; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-700 ${className}`}>
      <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
        <span className="text-slate-500">{icon}</span>
        {label}
      </div>
      <div className={`num mt-2 text-lg font-semibold sm:text-xl ${tone ?? 'text-slate-50'}`}>{value}</div>
      {sub && <div className={`num mt-0.5 text-xs ${tone ?? 'text-slate-500'}`}>{sub}</div>}
    </div>
  );
}

export function Metrics({ t, realized, soldCost }: { t: Totals; realized: number; soldCost: number }) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Card icon={<Wallet className="h-4 w-4" />} label="Valeur du portefeuille" value={`${fmtMAD(t.value)} MAD`} />
      <Card icon={<PiggyBank className="h-4 w-4" />} label="Montant investi" value={`${fmtMAD(t.invested)} MAD`} />
      <Card
        icon={<Landmark className="h-4 w-4" />}
        label="Plus/moins-value latente"
        value={`${fmtSigned(t.pnl)} MAD`}
        sub={fmtPct(t.pnlPct)}
        tone={toneClass(t.pnl)}
      />
      <Card
        icon={<CalendarClock className="h-4 w-4" />}
        label="Variation du jour"
        value={`${fmtSigned(t.dayChange)} MAD`}
        sub={fmtPct(t.dayPct)}
        tone={toneClass(t.dayChange)}
      />
      <Card
        className="col-span-2 lg:col-span-1"
        icon={<BadgeCheck className="h-4 w-4" />}
        label="Plus/moins-value réalisée"
        value={`${fmtSigned(realized)} MAD`}
        sub={soldCost ? fmtPct((realized / soldCost) * 100) : 'Aucune vente'}
        tone={soldCost ? toneClass(realized) : undefined}
      />
    </section>
  );
}
