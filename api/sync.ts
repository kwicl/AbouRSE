// Synchronisation multi-appareils : un document JSON par code de synchronisation.
// Stockage : Upstash Redis (intégration Vercel Marketplace, variables KV_REST_API_* ou UPSTASH_REDIS_REST_*).
// Le client n'envoie jamais le code en clair, seulement son empreinte SHA-256 (64 caractères hex).

const MAX_BYTES = 512 * 1024;

const REDIS_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

// hors Vercel (npm run dev) sans Redis configuré : stockage mémoire pour tester le parcours
const memory = new Map<string, string>();
const useMemory = !REDIS_URL && !process.env.VERCEL;

async function redis(command: (string | number)[]): Promise<unknown> {
  const res = await fetch(REDIS_URL!, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

const keyOf = (k: string | null) => (k && /^[a-f0-9]{64}$/.test(k) ? `abourse:sync:${k}` : null);

export async function GET(request: Request): Promise<Response> {
  const key = keyOf(new URL(request.url).searchParams.get('key'));
  if (!key) return json({ error: 'Clé invalide' }, 400);
  if (!useMemory && !REDIS_URL) return json({ error: 'Synchronisation non configurée sur le serveur' }, 503);
  try {
    const raw = useMemory ? memory.get(key) : ((await redis(['GET', key])) as string | null);
    if (!raw) return json({ error: 'Aucune donnée pour ce code' }, 404);
    return new Response(raw, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, 502);
  }
}

export async function PUT(request: Request): Promise<Response> {
  const key = keyOf(new URL(request.url).searchParams.get('key'));
  if (!key) return json({ error: 'Clé invalide' }, 400);
  if (!useMemory && !REDIS_URL) return json({ error: 'Synchronisation non configurée sur le serveur' }, 503);

  const body = await request.text();
  if (body.length > MAX_BYTES) return json({ error: 'Données trop volumineuses' }, 413);
  try {
    const doc = JSON.parse(body) as { updatedAt?: unknown; positions?: unknown; sales?: unknown };
    if (typeof doc.updatedAt !== 'number' || !Array.isArray(doc.positions) || !Array.isArray(doc.sales)) {
      return json({ error: 'Format invalide' }, 400);
    }
  } catch {
    return json({ error: 'JSON invalide' }, 400);
  }

  try {
    if (useMemory) memory.set(key, body);
    else await redis(['SET', key, body]);
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, 502);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
