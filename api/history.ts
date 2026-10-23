// Historique des cours de clôture journaliers d'une action BVC (flux graphique TradingView).
// Réponse mise en cache 1 h sur le CDN Vercel. Nécessite Node 22+ (WebSocket natif).

const WS_URL = 'wss://data.tradingview.com/socket.io/websocket?type=chart';
const BARS = 1500; // ~6 ans de séances
const TIMEOUT_MS = 12_000;

const frame = (m: string, p: unknown[]) => {
  const s = JSON.stringify({ m, p });
  return `~m~${s.length}~m~${s}`;
};

function fetchBars(symbol: string): Promise<[number, number][]> {
  return new Promise((resolve, reject) => {
    const session = 'cs_' + Math.random().toString(36).slice(2, 14);
    // l'implémentation WebSocket de Node (undici) accepte des en-têtes ; TradingView exige l'Origin
    const ws = new WebSocket(WS_URL, { headers: { Origin: 'https://www.tradingview.com' } } as unknown as string[]);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('Délai dépassé'));
    }, TIMEOUT_MS);
    const done = (fn: () => void) => {
      clearTimeout(timer);
      ws.close();
      fn();
    };

    ws.onopen = () => {
      ws.send(frame('set_auth_token', ['unauthorized_user_token']));
      ws.send(frame('chart_create_session', [session, '']));
      ws.send(frame('resolve_symbol', [session, 'sym', '=' + JSON.stringify({ symbol, adjustment: 'splits' })]));
      ws.send(frame('create_series', [session, 'ser', 's1', 'sym', '1D', BARS, '']));
    };
    ws.onerror = () => done(() => reject(new Error('Connexion impossible')));
    ws.onmessage = (e) => {
      for (const msg of String(e.data).split(/~m~\d+~m~/)) {
        if (!msg) continue;
        if (msg.startsWith('~h~')) {
          ws.send(`~m~${msg.length}~m~${msg}`); // battement de cœur
          continue;
        }
        let j: { m?: string; p?: unknown[] };
        try {
          j = JSON.parse(msg);
        } catch {
          continue;
        }
        if (j.m === 'symbol_error' || j.m === 'series_error' || j.m === 'critical_error') {
          return done(() => reject(new Error('Titre inconnu')));
        }
        if (j.m === 'timescale_update') {
          const bars = (j.p?.[1] as { ser?: { s?: { v: number[] }[] } })?.ser?.s ?? [];
          // v = [horodatage (s), ouverture, plus haut, plus bas, clôture, volume]
          return done(() => resolve(bars.map((b) => [b.v[0], b.v[4]])));
        }
      }
    };
  });
}

export async function GET(request: Request): Promise<Response> {
  const ticker = new URL(request.url).searchParams.get('ticker') ?? '';
  if (!/^[A-Z0-9]{2,6}$/.test(ticker)) return json({ error: 'Ticker invalide' }, 400);
  try {
    const bars = await fetchBars(`CSEMA:${ticker}`);
    const points = bars
      .filter(([, close]) => close > 0)
      .map(([t, close]) => ({ date: new Date(t * 1000).toISOString().slice(0, 10), price: Math.round(close * 100) / 100 }));
    return json({ ticker, points }, 200, 'public, s-maxage=3600, stale-while-revalidate=86400');
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Historique indisponible' }, 502);
  }
}

function json(data: unknown, status = 200, cache = 'no-store'): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache },
  });
}
