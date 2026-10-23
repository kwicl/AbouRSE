// Cours de toutes les actions de la Bourse de Casablanca (scanner TradingView, marché « morocco »).
// Données différées de 15 minutes. Réponse mise en cache 20 s sur le CDN Vercel.

const SCANNER = 'https://scanner.tradingview.com/morocco/scan';

interface ScanRow {
  s: string;
  d: [name: string, description: string, close: number | null, changeAbs: number | null, updateMode: string | null];
}

export async function GET(): Promise<Response> {
  try {
    const res = await fetch(SCANNER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 AbouRSE' },
      body: JSON.stringify({
        filter: [{ left: 'type', operation: 'in_range', right: ['stock', 'dr', 'fund'] }],
        columns: ['name', 'description', 'close', 'change_abs', 'update_mode'],
        range: [0, 400],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return json({ error: `Scanner HTTP ${res.status}` }, 502);
    const rows = ((await res.json()) as { data?: ScanRow[] }).data ?? [];

    const quotes = rows
      .filter((r) => typeof r.d[2] === 'number' && r.d[2] > 0)
      .map((r) => {
        const [ticker, name, close, changeAbs] = r.d;
        return { ticker, name, price: close as number, prevClose: Math.round(((close as number) - (changeAbs ?? 0)) * 100) / 100 };
      });
    if (quotes.length === 0) return json({ error: 'Aucun cours reçu' }, 502);

    const mode = rows[0]?.d[4] ?? '';
    return json(
      { source: 'TradingView', delayMinutes: /_(\d+)$/.test(mode) ? Number(mode.match(/_(\d+)$/)![1]) / 60 : 0, at: Date.now(), quotes },
      200,
      'public, s-maxage=20, stale-while-revalidate=60',
    );
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Flux indisponible' }, 502);
  }
}

function json(data: unknown, status = 200, cache = 'no-store'): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache },
  });
}
