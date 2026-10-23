import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Position, Sale } from '../lib/types';
import { fmtMAD, fmtPct, fmtSigned, toneClass, todayISO } from '../lib/format';

interface Props {
  position: Position;
  currentPrice?: number;
  onSell: (s: Sale) => void;
  onClose: () => void;
}

const field =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/20';

export function SellModal({ position: p, currentPrice, onSell, onClose }: Props) {
  const [qty, setQty] = useState(String(p.qty));
  const [price, setPrice] = useState(currentPrice ? currentPrice.toFixed(2) : '');
  const [date, setDate] = useState(todayISO());
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const q = Number(qty.replace(',', '.'));
  const sp = Number(price.replace(',', '.'));
  const gain = (sp - p.buyPrice) * q;
  const gainPct = p.buyPrice ? (sp / p.buyPrice - 1) * 100 : 0;
  const valid = q > 0 && sp > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(q > 0) || q > p.qty) return setErr(`Quantité entre 1 et ${p.qty}.`);
    if (!(sp > 0)) return setErr('Le prix de vente doit être positif.');
    if (!date || date > todayISO() || date < p.buyDate) return setErr("La date doit être entre la date d'achat et aujourd'hui.");
    onSell({
      id: crypto.randomUUID(),
      positionId: p.id,
      ticker: p.ticker,
      name: p.name,
      qty: q,
      buyPrice: p.buyPrice,
      sellPrice: sp,
      date,
      buyDate: p.buyDate,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <form
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        className="safe-bottom max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sell-title"
      >
        <div className="mx-auto -mt-2 mb-3 h-1 w-10 rounded-full bg-slate-700 sm:hidden" aria-hidden />
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 id="sell-title" className="text-lg font-semibold text-slate-100">
              Vendre {p.ticker}
            </h3>
            <p className="num text-xs text-slate-500">
              {p.qty} titres • PRU {fmtMAD(p.buyPrice)} MAD
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="text-xs text-slate-400">
            Quantité vendue
            <input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} className={`${field} num mt-1`} autoFocus />
          </label>
          <label className="text-xs text-slate-400">
            Prix de vente (MAD)
            <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={`${field} num mt-1`} />
          </label>
          <label className="col-span-2 text-xs text-slate-400 sm:col-span-1">
            Date de vente
            <input type="date" style={{ minHeight: '2.5rem' }} value={date} min={p.buyDate} max={todayISO()} onChange={(e) => setDate(e.target.value)} className={`${field} mt-1 px-2`} />
          </label>
        </div>

        <div className="mt-4 space-y-1 rounded-lg bg-slate-950/60 px-3 py-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Montant de la vente</span>
            <span className="num text-slate-100">{valid ? `${fmtMAD(q * sp)} MAD` : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Plus-value réalisée</span>
            <span className={`num font-semibold ${toneClass(gain)}`}>
              {valid ? `${fmtSigned(gain)} MAD (${fmtPct(gainPct)})` : '—'}
            </span>
          </div>
        </div>

        {err && <p className="mt-3 text-sm text-rose-400">{err}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
            Annuler
          </button>
          <button type="submit" className="rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
            Confirmer la vente
          </button>
        </div>
      </form>
    </div>
  );
}
