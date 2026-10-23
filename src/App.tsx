import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { HeroChart } from './components/HeroChart';
import { Metrics } from './components/Metrics';
import { PositionsTable } from './components/PositionsTable';
import { PositionModal } from './components/PositionModal';
import { SellModal } from './components/SellModal';
import { SalesList } from './components/SalesList';
import { SyncPanel, type SyncStatus } from './components/SyncPanel';
import { isMarketOpen, useMarket } from './lib/market';
import { buildRows, totals as computeTotals } from './lib/portfolio';
import { clearIntraday, computeDaily, loadIntraday, recordIntraday } from './lib/history';
import { clearPrices, ensureHistories, loadPrices, recordPrices } from './lib/prices';
import { load, save } from './lib/storage';
import { UNIVERSE_MAP } from './lib/universe';
import { getSyncCode, isValidCode, newSyncCode, normalizeCode, pull, push, setSyncCode, type SyncDoc } from './lib/sync';
import type { IntradayPoint, Position, PriceHistory, Sale } from './lib/types';

// Portefeuille par défaut : quantités et prix d'achat indicatifs, à ajuster via « Modifier »
const DEFAULT_POSITIONS: Position[] = [
  { id: 'def-iam', ticker: 'IAM', name: 'Itissalat Al-Maghrib (Maroc Telecom)', qty: 200, buyPrice: 95, buyDate: '2025-03-12' },
  { id: 'def-tgc', ticker: 'TGC', name: 'TGCC', qty: 30, buyPrice: 560, buyDate: '2025-05-20' },
  { id: 'def-gtm', ticker: 'GTM', name: 'SGTM', qty: 40, buyPrice: 420, buyDate: '2025-12-15' },
  { id: 'def-cih', ticker: 'CIH', name: 'CIH Bank', qty: 50, buyPrice: 300, buyDate: '2025-07-08' },
  { id: 'def-ris', ticker: 'RIS', name: 'Risma', qty: 80, buyPrice: 250, buyDate: '2025-09-24' },
];

const SYNC_DEBOUNCE_MS = 1500;

// clés de l'ancien mode démo (cours simulés), supprimées au démarrage
const LEGACY_KEYS = ['demo-quotes', 'needs-demo-history', 'history-daily'];

function initialPositions(): Position[] {
  try {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem('abourse:' + k));
  } catch {
    /* stockage indisponible */
  }
  const stored = load<Position[] | null>('positions', null);
  if (!stored || (stored.length > 0 && stored.every((p) => p.id.startsWith('demo-')))) {
    save('positions', DEFAULT_POSITIONS);
    save('local-updated-at', 0);
    clearPrices();
    return DEFAULT_POSITIONS;
  }
  // Centrale Danone n'est plus cotée : ligne par défaut non modifiée retirée
  return stored.filter((p) => !(p.id === 'def-cda' && p.qty === 25 && p.buyPrice === 610));
}

export default function App() {
  const [positions, setPositions] = useState<Position[]>(initialPositions);
  const [sales, setSales] = useState<Sale[]>(() => load<Sale[]>('sales', []));
  const [modal, setModal] = useState<Partial<Position> | null>(null);
  const [selling, setSelling] = useState<Position | null>(null);
  const [intraday, setIntraday] = useState<IntradayPoint[]>(loadIntraday);
  const [prices, setPrices] = useState<PriceHistory>(loadPrices);
  const [showSync, setShowSync] = useState(false);
  const [syncCode, setCode] = useState<string | null>(getSyncCode);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: getSyncCode() ? 'ok' : 'off', at: null });

  const market = useMarket();
  const rows = useMemo(() => buildRows(positions, market.quotes), [positions, market.quotes]);
  const totals = useMemo(() => computeTotals(rows), [rows]);
  const daily = useMemo(() => computeDaily(positions, sales, prices), [positions, sales, prices]);

  const { realizedByTicker, realizedTotal, soldCost } = useMemo(() => {
    const byTicker: Record<string, number> = {};
    let total = 0;
    let cost = 0;
    for (const s of sales) {
      const g = (s.sellPrice - s.buyPrice) * s.qty;
      byTicker[s.ticker] = (byTicker[s.ticker] ?? 0) + g;
      total += g;
      cost += s.buyPrice * s.qty;
    }
    return { realizedByTicker: byTicker, realizedTotal: total, soldCost: cost };
  }, [sales]);

  /* ── Historique réel des cours (titres détenus + titres vendus) ───────── */

  const tickers = useMemo(() => [...new Set([...positions, ...sales].map((p) => p.ticker))].sort(), [positions, sales]);
  const tickersKey = tickers.join(',');

  useEffect(() => {
    if (tickers.length) void ensureHistories(tickers).then(setPrices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickersKey, market.mode === 'live']);

  // cours direct : point du jour dans l'historique + courbe intraday pendant la séance
  useEffect(() => {
    if (market.mode !== 'live' || tickers.length === 0) return;
    setPrices(recordPrices(market.quotes, tickers));
    if (isMarketOpen() && positions.length) setIntraday(recordIntraday(totals.value, totals.invested));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market.fetchedAt]);

  /* ── Synchronisation multi-appareils ─────────────────────────────────── */

  const applyingRemote = useRef(false);
  const firstRender = useRef(true);
  const pushTimer = useRef<ReturnType<typeof setTimeout>>();
  const stateRef = useRef({ positions, sales });
  stateRef.current = { positions, sales };

  const localDoc = (): SyncDoc => ({ updatedAt: load<number>('local-updated-at', 0), ...stateRef.current });

  const applyRemote = (doc: SyncDoc) => {
    applyingRemote.current = true;
    setPositions(doc.positions);
    setSales(doc.sales);
    save('local-updated-at', doc.updatedAt);
  };

  const syncNow = useCallback(async (code = getSyncCode()) => {
    if (!code) return;
    setSyncStatus((s) => ({ ...s, state: 'syncing' }));
    try {
      const remote = await pull(code);
      const local = localDoc();
      if (remote && remote.updatedAt > local.updatedAt) applyRemote(remote);
      else if (!remote || local.updatedAt > remote.updatedAt) await push(code, local);
      setSyncStatus({ state: 'ok', at: Date.now() });
    } catch (e) {
      setSyncStatus({ state: 'error', at: null, message: e instanceof Error ? e.message : 'Erreur réseau' });
    }
  }, []);

  const join = useCallback(async (raw: string) => {
    const code = normalizeCode(raw);
    setSyncStatus({ state: 'syncing', at: null });
    try {
      const remote = await pull(code);
      if (!remote) throw new Error('Aucune donnée pour ce code');
      applyRemote(remote);
      setSyncCode(code);
      setCode(code);
      setSyncStatus({ state: 'ok', at: Date.now() });
    } catch (e) {
      setSyncStatus({ state: 'error', at: null, message: e instanceof Error ? e.message : 'Erreur réseau' });
    }
  }, []);

  const create = async () => {
    const code = newSyncCode();
    save('local-updated-at', Date.now());
    setSyncStatus({ state: 'syncing', at: null });
    try {
      await push(code, localDoc());
      setSyncCode(code);
      setCode(code);
      setSyncStatus({ state: 'ok', at: Date.now() });
    } catch (e) {
      setSyncStatus({ state: 'error', at: null, message: e instanceof Error ? e.message : 'Erreur réseau' });
    }
  };

  const disconnect = () => {
    setSyncCode(null);
    setCode(null);
    setSyncStatus({ state: 'off', at: null });
  };

  // ouverture de l'app (lien #sync=CODE, ou synchro normale) et retour au premier plan
  useEffect(() => {
    const fromLink = location.hash.match(/sync=([A-Za-z0-9-]+)/)?.[1];
    if (fromLink && isValidCode(fromLink)) {
      history.replaceState(null, '', location.pathname);
      void join(fromLink);
      setShowSync(true);
    } else void syncNow();
    const onVisible = () => document.visibilityState === 'visible' && void syncNow();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [join, syncNow]);

  // modification locale : sauvegarde + envoi différé
  useEffect(() => {
    save('positions', positions);
    save('sales', sales);
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (applyingRemote.current) {
      applyingRemote.current = false;
      return;
    }
    save('local-updated-at', Date.now());
    const code = getSyncCode();
    if (!code) return;
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      setSyncStatus((s) => ({ ...s, state: 'syncing' }));
      push(code, localDoc())
        .then(() => setSyncStatus({ state: 'ok', at: Date.now() }))
        .catch((e: unknown) => setSyncStatus({ state: 'error', at: null, message: e instanceof Error ? e.message : 'Erreur réseau' }));
    }, SYNC_DEBOUNCE_MS);
  }, [positions, sales]);

  /* ── Actions ─────────────────────────────────────────────────────────── */

  const sell = (s: Sale) => {
    setSales((ss) => [...ss, s]);
    setPositions((ps) => ps.flatMap((p) => (p.id !== s.positionId ? [p] : p.qty - s.qty > 0 ? [{ ...p, qty: p.qty - s.qty }] : [])));
    setSelling(null);
  };

  const cancelSale = (id: string) => {
    const s = sales.find((x) => x.id === id);
    if (!s || !window.confirm(`Annuler la vente de ${s.qty} ${s.ticker} ? Les titres reviennent en portefeuille.`)) return;
    setSales((ss) => ss.filter((x) => x.id !== id));
    setPositions((ps) =>
      ps.some((p) => p.id === s.positionId)
        ? ps.map((p) => (p.id === s.positionId ? { ...p, qty: p.qty + s.qty } : p))
        : [...ps, { id: s.positionId, ticker: s.ticker, name: s.name, qty: s.qty, buyPrice: s.buyPrice, buyDate: s.buyDate ?? s.date }],
    );
  };

  const savePosition = (p: Position) => {
    setPositions((ps) => (ps.some((x) => x.id === p.id) ? ps.map((x) => (x.id === p.id ? p : x)) : [...ps, p]));
    setModal(null);
  };

  const deletePosition = (id: string) => {
    const p = positions.find((x) => x.id === id);
    if (p && window.confirm(`Supprimer la position ${p.ticker} (${p.qty} titres) ?`)) setPositions((ps) => ps.filter((x) => x.id !== id));
  };

  const reset = () => {
    const msg = syncCode
      ? "Effacer toutes les positions et ventes ? L'effacement sera aussi synchronisé sur vos autres appareils."
      : 'Effacer toutes les positions et ventes ? Cette action est irréversible.';
    if (!window.confirm(msg)) return;
    setPositions([]);
    setSales([]);
    clearIntraday();
    setIntraday([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(16,185,129,0.06),transparent)]">
      <TopBar
        quotes={market.quotes}
        mode={market.mode}
        open={market.open}
        updatedAt={market.updatedAt}
        error={market.error}
        onRefresh={() => {
          void market.refresh();
          void syncNow();
        }}
        onPick={(t) => {
          const existing = positions.find((p) => p.ticker === t);
          setModal(existing ?? { ticker: t, name: UNIVERSE_MAP[t]?.name ?? market.quotes[t]?.name });
        }}
        sync={syncStatus.state}
        onSync={() => setShowSync(true)}
      />

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:space-y-6 sm:py-8">
        {market.mode === 'error' && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            Impossible de récupérer les cours ({market.error}). Vérifiez votre connexion puis actualisez.
          </div>
        )}
        <HeroChart daily={daily} intraday={intraday} totals={totals} />
        <Metrics t={totals} realized={realizedTotal} soldCost={soldCost} />
        <PositionsTable
          rows={rows}
          prices={prices}
          realized={realizedByTicker}
          onAdd={() => setModal({})}
          onEdit={(id) => setModal(positions.find((p) => p.id === id) ?? null)}
          onSell={(id) => setSelling(positions.find((p) => p.id === id) ?? null)}
          onDelete={deletePosition}
        />
        <SalesList sales={sales} onDelete={cancelSale} />

        <footer className="safe-bottom flex flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-1.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {market.mode === 'live'
              ? `Cours de la Bourse de Casablanca (différés de ${market.delayMinutes} min), actualisés à chaque ouverture et toutes les 30 s en séance.`
              : 'Flux injoignable : derniers cours réels connus affichés.'}
            {syncCode ? ' Positions synchronisées entre vos appareils.' : ' Positions enregistrées sur cet appareil.'}
          </p>
          <button onClick={reset} className="flex items-center gap-1 self-start rounded-md px-2 py-1 hover:bg-slate-900 hover:text-slate-300 sm:self-auto">
            <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
          </button>
        </footer>
      </main>

      {modal && (
        <PositionModal
          key={modal.id ?? modal.ticker ?? 'new'}
          initial={modal}
          currentPrice={modal.ticker ? market.quotes[modal.ticker]?.price : undefined}
          onSave={savePosition}
          onClose={() => setModal(null)}
        />
      )}
      {selling && (
        <SellModal key={selling.id} position={selling} currentPrice={market.quotes[selling.ticker]?.price} onSell={sell} onClose={() => setSelling(null)} />
      )}
      {showSync && (
        <SyncPanel
          code={syncCode}
          status={syncStatus}
          onCreate={() => void create()}
          onJoin={(c) => void join(c)}
          onSyncNow={() => void syncNow()}
          onDisconnect={disconnect}
          onClose={() => setShowSync(false)}
        />
      )}
    </div>
  );
}
