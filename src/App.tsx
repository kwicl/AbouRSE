import { useEffect, useMemo, useState } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { HeroChart } from './components/HeroChart';
import { Metrics } from './components/Metrics';
import { PositionsTable } from './components/PositionsTable';
import { PositionModal } from './components/PositionModal';
import { SellModal } from './components/SellModal';
import { SalesList } from './components/SalesList';
import { useMarket } from './lib/market';
import { buildRows, totals as computeTotals } from './lib/portfolio';
import { clearHistory, loadDaily, loadIntraday, recordSnapshot, seedDemoHistory } from './lib/history';
import { clearPrices, loadPrices, recordPrices, seedTicker } from './lib/prices';
import { load, save } from './lib/storage';
import { UNIVERSE_MAP } from './lib/universe';
import type { DailyPoint, IntradayPoint, Position, PriceHistory, Sale } from './lib/types';

// contexte affiché avant la date d'achat dans l'historique simulé
const SEED_LEAD_DAYS = 60;

// Portefeuille par défaut : quantités et prix d'achat indicatifs, à ajuster via « Modifier »
const DEFAULT_POSITIONS: Position[] = [
  { id: 'def-iam', ticker: 'IAM', name: 'Itissalat Al-Maghrib (Maroc Telecom)', qty: 200, buyPrice: 104, buyDate: '2025-03-12' },
  { id: 'def-tgc', ticker: 'TGC', name: 'TGCC', qty: 30, buyPrice: 640, buyDate: '2025-05-20' },
  { id: 'def-gtm', ticker: 'GTM', name: 'SGTM', qty: 40, buyPrice: 420, buyDate: '2025-12-15' },
  { id: 'def-cih', ticker: 'CIH', name: 'CIH Bank', qty: 50, buyPrice: 385, buyDate: '2025-07-08' },
  { id: 'def-ris', ticker: 'RIS', name: 'Risma', qty: 80, buyPrice: 228, buyDate: '2025-09-24' },
  { id: 'def-cda', ticker: 'CDA', name: 'Centrale Danone', qty: 25, buyPrice: 610, buyDate: '2026-02-03' },
];

function initialPositions(): Position[] {
  const stored = load<Position[] | null>('positions', null);
  // ancien portefeuille démo (ids « demo-* ») non modifié : remplacé par le nouveau défaut
  const isOldDemo = stored != null && stored.length > 0 && stored.every((p) => p.id.startsWith('demo-'));
  if (stored && !isOldDemo) {
    // portefeuille par défaut sans historique par titre : régénérer un historique démo cohérent
    const isDefault = stored.length > 0 && stored.every((p) => p.id.startsWith('def-'));
    if (isDefault && Object.keys(loadPrices()).length === 0) save('needs-demo-history', true);
    return stored;
  }
  save('positions', DEFAULT_POSITIONS);
  save('needs-demo-history', true);
  return DEFAULT_POSITIONS;
}

export default function App() {
  const [positions, setPositions] = useState<Position[]>(initialPositions);
  const [modal, setModal] = useState<Partial<Position> | null>(null);
  const [selling, setSelling] = useState<Position | null>(null);
  const [sales, setSales] = useState<Sale[]>(() => load<Sale[]>('sales', []));
  const [daily, setDaily] = useState<DailyPoint[]>(loadDaily);
  const [intraday, setIntraday] = useState<IntradayPoint[]>(loadIntraday);
  const [prices, setPrices] = useState<PriceHistory>(loadPrices);

  // cours de base pour les titres hors univers BVC connu
  const customBases = useMemo(
    () => Object.fromEntries(positions.filter((p) => !UNIVERSE_MAP[p.ticker]).map((p) => [p.ticker, p.buyPrice])),
    [positions],
  );
  const market = useMarket(customBases);

  const rows = useMemo(() => buildRows(positions, market.quotes), [positions, market.quotes]);
  const totals = useMemo(() => computeTotals(rows), [rows]);

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

  useEffect(() => save('positions', positions), [positions]);
  useEffect(() => save('sales', sales), [sales]);

  // enregistrement automatique : cours par titre + valeur du portefeuille (journalier + intraday)
  useEffect(() => {
    if (!market.updatedAt || positions.length === 0) return;
    const tickers = [...new Set(positions.map((p) => p.ticker))];
    if (market.mode === 'demo') {
      for (const p of positions) {
        const q = market.quotes[p.ticker];
        if (!q) continue;
        const from = new Date(p.buyDate + 'T12:00:00');
        from.setDate(from.getDate() - SEED_LEAD_DAYS);
        seedTicker(p.ticker, from.toISOString().slice(0, 10), q.prevClose);
      }
    }
    const hist = recordPrices(market.quotes, tickers);
    if (load('needs-demo-history', false)) {
      seedDemoHistory(positions, hist, totals.value - totals.dayChange, totals.value);
      save('needs-demo-history', false);
    }
    const snap = recordSnapshot(totals.value, totals.invested);
    setPrices(hist);
    setDaily(snap.daily);
    setIntraday(snap.intraday);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market.updatedAt, positions.length]);

  const sell = (s: Sale) => {
    setSales((ss) => [...ss, s]);
    setPositions((ps) =>
      ps.flatMap((p) => (p.id !== s.positionId ? [p] : p.qty - s.qty > 0 ? [{ ...p, qty: p.qty - s.qty }] : [])),
    );
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
    if (p && window.confirm(`Supprimer la position ${p.ticker} (${p.qty} titres) ?`)) {
      setPositions((ps) => ps.filter((x) => x.id !== id));
    }
  };

  const reset = () => {
    if (!window.confirm("Effacer toutes les positions et l'historique ? Cette action est irréversible.")) return;
    setPositions([]);
    setSales([]);
    clearHistory();
    clearPrices();
    setDaily([]);
    setIntraday([]);
    setPrices({});
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(16,185,129,0.06),transparent)]">
      <TopBar
        quotes={market.quotes}
        mode={market.mode}
        open={market.open}
        updatedAt={market.updatedAt}
        error={market.error}
        onRefresh={() => void market.refresh()}
        onPick={(t) => {
          const existing = positions.find((p) => p.ticker === t);
          setModal(existing ?? { ticker: t, name: UNIVERSE_MAP[t]?.name });
        }}
      />

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:space-y-6 sm:py-8">
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
              ? 'Cours issus de la Bourse de Casablanca (différés). Historique enregistré localement dans ce navigateur.'
              : 'Mode démo : flux BVC injoignable, cours simulés à partir de références indicatives. Historique enregistré localement.'}
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
        <SellModal
          key={selling.id}
          position={selling}
          currentPrice={market.quotes[selling.ticker]?.price}
          onSell={sell}
          onClose={() => setSelling(null)}
        />
      )}
    </div>
  );
}
