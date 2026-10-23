import type { Position, Sale } from './types';
import { load, save } from './storage';

/** Document synchronisé entre appareils (les cours et l'historique sont rechargés depuis le marché). */
export interface SyncDoc {
  updatedAt: number;
  positions: Position[];
  sales: Sale[];
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans 0/O/1/I pour éviter les confusions

/** Code aléatoire de 20 caractères (~100 bits), affiché par groupes de 5 */
export function newSyncCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const raw = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
  return raw.match(/.{5}/g)!.join('-');
}

export const normalizeCode = (c: string) =>
  c.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{5})(?=.)/g, '$1-');

export const isValidCode = (c: string) => /^([A-Z0-9]{5}-){3}[A-Z0-9]{5}$/.test(normalizeCode(c));

async function keyOf(code: string): Promise<string> {
  const data = new TextEncoder().encode('abourse:' + normalizeCode(code));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const getSyncCode = () => load<string | null>('sync-code', null);
export const setSyncCode = (c: string | null) => save('sync-code', c ? normalizeCode(c) : null);

export async function pull(code: string): Promise<SyncDoc | null> {
  const res = await fetch(`/api/sync?key=${await keyOf(code)}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? `HTTP ${res.status}`);
  return (await res.json()) as SyncDoc;
}

export async function push(code: string, doc: SyncDoc): Promise<void> {
  const res = await fetch(`/api/sync?key=${await keyOf(code)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? `HTTP ${res.status}`);
}
