import { Trash2 } from 'lucide-react';
import type { Sale } from '../lib/types';
import { fmtMAD, fmtPct, fmtSigned, toneClass } from '../lib/format';

interface Props {
  sales: Sale[];
  onDelete: (id: string) => void;
}

export function SalesList({ sales, onDelete }: Props) {
  if (sales.length === 0) return null;
  const sorted = [...sales].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40">
      <div className="px-4 py-4">
        <h2 className="text-base font-semibold text-slate-100">Ventes réalisées</h2>
        <p className="text-xs text-slate-500">Plus/moins-values encaissées, par opération</p>
      </div>
      <ul className="divide-y divide-slate-800/70 border-t border-slate-800">
        {sorted.map((s) => {
          const gain = (s.sellPrice - s.buyPrice) * s.qty;
          const pct = (s.sellPrice / s.buyPrice - 1) * 100;
          return (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-slate-100">{s.ticker}</span>
                  <span className="num text-xs text-slate-500">
                    {new Date(s.date + 'T12:00:00').toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="num truncate text-xs text-slate-500">
                  {s.qty} × {fmtMAD(s.sellPrice)} (PRU {fmtMAD(s.buyPrice)})
                </div>
              </div>
              <div className={`num text-right ${toneClass(gain)}`}>
                <div className="font-semibold">{fmtSigned(gain)}</div>
                <div className="text-xs opacity-80">{fmtPct(pct)}</div>
              </div>
              <button
                onClick={() => onDelete(s.id)}
                aria-label={`Annuler la vente ${s.ticker}`}
                title="Annuler la vente (remet les titres en portefeuille)"
                className="rounded-md p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
