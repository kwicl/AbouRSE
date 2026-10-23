import { useEffect, useState } from 'react';
import { Check, Cloud, Copy, Link2, LogOut, RefreshCw, Share2, X } from 'lucide-react';
import { isValidCode, normalizeCode } from '../lib/sync';

export interface SyncStatus {
  state: 'off' | 'syncing' | 'ok' | 'error';
  at: number | null;
  message?: string;
}

interface Props {
  code: string | null;
  status: SyncStatus;
  onCreate: () => void;
  onJoin: (code: string) => void;
  onSyncNow: () => void;
  onDisconnect: () => void;
  onClose: () => void;
}

export function SyncPanel({ code, status, onCreate, onJoin, onSyncNow, onDisconnect, onClose }: Props) {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const link = code ? `${location.origin}/#sync=${code}` : '';

  const copy = async (text: string, what: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt('Copiez :', text);
    }
  };

  const share = () => navigator.share?.({ title: 'AbouRSE', text: 'Lien de synchronisation AbouRSE (privé)', url: link }).catch(() => {});

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="safe-bottom max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-title"
      >
        <div className="mx-auto -mt-2 mb-3 h-1 w-10 rounded-full bg-slate-700 sm:hidden" aria-hidden />
        <div className="mb-4 flex items-center justify-between">
          <h3 id="sync-title" className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <Cloud className="h-5 w-5 text-sky-400" /> Synchronisation
          </h3>
          <button onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {code ? (
          <>
            <p className="text-sm text-slate-400">
              Cet appareil est synchronisé. Ouvrez le lien ci-dessous (ou saisissez le code) sur un autre appareil pour retrouver vos positions et ventes.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5">
              <span className="num flex-1 select-all text-center text-base font-semibold tracking-wider text-sky-300">{code}</span>
              <button onClick={() => copy(code, 'code')} aria-label="Copier le code" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100">
                {copied === 'code' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => copy(link, 'link')} className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
                {copied === 'link' ? <Check className="h-4 w-4 text-emerald-400" /> : <Link2 className="h-4 w-4" />} Copier le lien
              </button>
              {'share' in navigator ? (
                <button onClick={share} className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
                  <Share2 className="h-4 w-4" /> Partager
                </button>
              ) : (
                <button onClick={onSyncNow} className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
                  <RefreshCw className="h-4 w-4" /> Synchroniser
                </button>
              )}
            </div>

            <p className={`mt-4 text-xs ${status.state === 'error' ? 'text-rose-400' : 'text-slate-500'}`}>
              {status.state === 'syncing' && 'Synchronisation en cours…'}
              {status.state === 'ok' && status.at && `Dernière synchronisation : ${new Date(status.at).toLocaleString('fr-MA')}`}
              {status.state === 'error' && `Échec : ${status.message ?? 'erreur inconnue'}`}
            </p>
            <p className="mt-2 text-xs text-amber-300/80">
              Gardez ce code privé : toute personne qui le possède peut voir et modifier votre portefeuille.
            </p>

            <button onClick={onDisconnect} className="mt-4 flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400">
              <LogOut className="h-3.5 w-3.5" /> Déconnecter cet appareil (les données locales sont conservées)
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-400">
              Retrouvez vos positions et ventes sur tous vos appareils (téléphone, ordinateur) via un code privé.
            </p>
            <button onClick={onCreate} className="mt-4 w-full rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400">
              Activer la synchronisation sur cet appareil
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-slate-600">
              <div className="h-px flex-1 bg-slate-800" /> ou rejoindre un appareil existant <div className="h-px flex-1 bg-slate-800" />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (isValidCode(input)) onJoin(normalizeCode(input));
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(normalizeCode(e.target.value))}
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="num w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm tracking-wider text-slate-100 outline-none focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/20"
              />
              <button
                type="submit"
                disabled={!isValidCode(input)}
                className="shrink-0 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-40"
              >
                Rejoindre
              </button>
            </form>
            <p className="mt-2 text-xs text-slate-500">Les positions de cet appareil seront remplacées par celles du compte rejoint.</p>
            {status.state === 'error' && <p className="mt-3 text-sm text-rose-400">{status.message}</p>}
          </>
        )}
      </div>
    </div>
  );
}
