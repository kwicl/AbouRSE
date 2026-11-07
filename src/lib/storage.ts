const PREFIX = 'abourse:';

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* stockage indisponible (navigation privée, quota) : on ignore */
  }
}

/**
 * Version du format des données locales. Les positions et ventes ne sont JAMAIS modifiées ni supprimées
 * par une mise à jour de l'app : les nouveaux champs sont optionnels et les anciennes données restent lisibles.
 */
const SCHEMA_VERSION = 3;

export function migrate(): void {
  if (load<number>('schema', 0) >= SCHEMA_VERSION) return;
  // v3 : l'historique des cours gagne les champs optionnels o/h/l (bougies) ; rien à convertir
  save('schema', SCHEMA_VERSION);
}

/** Demande au navigateur de ne pas effacer les données de l'app (iOS / Chrome) */
export function requestPersistence(): void {
  try {
    void navigator.storage?.persist?.();
  } catch {
    /* non supporté */
  }
}

export interface Backup {
  at: number;
  reason: string;
  positions: unknown[];
  sales: unknown[];
}

/** Copie de sécurité automatique avant toute opération qui remplace les données (synchro, import, réinitialisation) */
export function saveBackup(reason: string, positions: unknown[], sales: unknown[]): void {
  if (positions.length === 0 && sales.length === 0) return; // ne jamais écraser une bonne copie par du vide
  save<Backup>('backup', { at: Date.now(), reason, positions, sales });
}

export const loadBackup = () => load<Backup | null>('backup', null);
