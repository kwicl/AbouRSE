import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Position } from '../lib/types';
import { UNIVERSE, UNIVERSE_MAP } from '../lib/universe';
import { fmtMAD, todayISO } from '../lib/format';

interface Props {
  initial: Partial<Position> | null;
  currentPrice?: number;
  onSave: (p: Position) => void;
  onClose: () => void;
}

const field =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/20';

export function PositionModal({ initial, currentPrice, onSave, onClose }: Props) {
  const [ticker, setTicker] = useState(initial?.ticker ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [qty, setQty] = useState(initial?.qty?.toString() ?? '');
  const [price, setPrice] = useState(initial?.buyPrice?.toString() ?? (currentPrice ? currentPrice.toFixed(2) : ''));
  const [date, setDate] = useState(initial?.buyDate ?? todayISO());
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onTicker = (v: string) => {
    const t = v.toUpperCase().trim();
    setTicker(t);
    if (UNIVERSE_MAP[t]) setName(UNIVERSE_MAP[t].name);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = Number(qty.replace(',', '.'));
    const p = Number(price.replace(',', '.'));
    if (!/^[A-Z0-9]{2,6}$/.test(ticker)) return setErr('Ticker invalide (2 à 6 caractères, ex. ATW).');
    if (!(q > 0)) return setErr('La quantité doit être positive.');
    if (!(p > 0)) return setErr("Le prix d'achat doit être positif.");
    if (!date || date > todayISO()) return setErr("Date d'achat invalide.");
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      ticker,
      name: name.trim() || UNIVERSE_MAP[ticker]?.name || ticker,
      qty: q,
      buyPrice: p,
      buyDate: date,
    });
  };

  const total = Number(qty.replace(',', '.')) * Number(price.replace(',', '.'));
  const editing = Boolean(initial?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <form
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        className="safe-bottom max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl sm:pb-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 id="pos-title" className="text-lg font-semibold text-slate-100">
            {editing ? 'Modifier la position' : 'Nouvelle position'}
          </h3>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-auto -mt-2 mb-3 h-1 w-10 rounded-full bg-slate-700 sm:hidden" aria-hidden />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="col-span-2 text-xs text-slate-400 sm:col-span-1">
            Ticker
            <input list="cse-tickers" value={ticker} onChange={(e) => onTicker(e.target.value)} className={`${field} mt-1 uppercase`} placeholder="ATW" autoFocus />
            <datalist id="cse-tickers">
              {UNIVERSE.map((i) => (
                <option key={i.ticker} value={i.ticker}>
                  {i.name}
                </option>
              ))}
            </datalist>
          </label>
          <label className="col-span-2 text-xs text-slate-400">
            Société
            <input value={name} onChange={(e) => setName(e.target.value)} className={`${field} mt-1`} placeholder="Maroc Telecom" />
          </label>
          <label className="text-xs text-slate-400">
            Quantité
            <input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} className={`${field} num mt-1`} placeholder="100" />
          </label>
          <label className="text-xs text-slate-400">
            Prix d'achat (MAD)
            <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={`${field} num mt-1`} placeholder="650,00" />
          </label>
          <label className="text-xs text-slate-400">
            Date d'achat
            <input type="date" style={{ minHeight: '2.5rem' }} value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} className={`${field} mt-1 px-2`} />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-2 text-sm">
          <span className="text-slate-400">Montant investi</span>
          <span className="num font-semibold text-slate-100">{isFinite(total) && total > 0 ? `${fmtMAD(total)} MAD` : '—'}</span>
        </div>

        {err && <p className="mt-3 text-sm text-rose-400">{err}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
            Annuler
          </button>
          <button type="submit" className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
            {editing ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  );
}
