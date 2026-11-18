import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageIcon, RefreshCw } from 'lucide-react';
import { load, save } from '../lib/storage';

/**
 * Fond d'écran dynamique (focus et persévérance) tiré de Wikimedia Commons via /api/wallpaper.
 * Nouvelle photo à chaque ouverture de l'app, puis toutes les 20 minutes ou à la demande.
 * La dernière photo est mémorisée pour s'afficher tout de suite au lancement suivant ;
 * sans réseau, la photo locale (body::before, /bg-night.jpg) reste en place.
 */

interface Photo {
  url: string;
  title: string;
  author: string;
  license: string;
  page: string;
}

const KEY = 'wallpaper';
const SEED_KEY = 'wallpaper-seed';
const EVERY_MS = 20 * 60_000;

const THEME_COUNT = 3; // = THEMES dans api/wallpaper.ts
const LIST_KEY = 'wallpaper-lists';

/** sélection d'un thème, gardée un jour sur l'appareil (moins d'appels réseau) */
async function themePhotos(theme: number): Promise<Photo[]> {
  const today = new Date().toDateString();
  const lists = load<Record<string, { day: string; photos: Photo[] }>>(LIST_KEY, {});
  const hit = lists[theme];
  if (hit?.day === today && hit.photos.length) return hit.photos;
  const res = await fetch(`/api/wallpaper?theme=${theme}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const photos = ((await res.json()) as { photos?: Photo[] }).photos ?? [];
  if (!photos.length) throw new Error('Aucune image');
  save(LIST_KEY, { ...lists, [theme]: { day: today, photos } });
  return photos;
}

function preload(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Image indisponible'));
    img.src = url;
  });
}

export function Wallpaper() {
  // deux calques pour le fondu : la photo affichée et la suivante
  const [layers, setLayers] = useState<[Photo | null, Photo | null]>([load<Photo | null>(KEY, null), null]);
  const [front, setFront] = useState(0);
  const frontRef = useRef(0);
  const [busy, setBusy] = useState(false);
  const seed = useRef(load<number>(SEED_KEY, Math.floor(Math.random() * 1000)));

  const next = useCallback(async () => {
    setBusy(true);
    try {
      // thème suivant à chaque changement (sommets, phares, paysages), photo au hasard dans la sélection
      seed.current += 1;
      save(SEED_KEY, seed.current);
      const photos = await themePhotos(seed.current % THEME_COUNT);
      const current = load<Photo | null>(KEY, null)?.url;
      const pool = photos.filter((p) => p.url !== current);
      const photo = pool[Math.floor(Math.random() * pool.length)] ?? photos[0];
      await preload(photo.url);
      save(KEY, photo);
      // la nouvelle photo va sur le calque caché, puis devient visible (fondu)
      const back = 1 - frontRef.current;
      frontRef.current = back;
      setLayers((l) => {
        const n: [Photo | null, Photo | null] = [l[0], l[1]];
        n[back] = photo;
        return n;
      });
      setFront(back);
    } catch {
      /* source injoignable : on garde la photo actuelle */
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void next();
    const id = setInterval(() => void next(), EVERY_MS);
    return () => clearInterval(id);
  }, [next]);

  const shown = layers[front];

  return (
    <>
      {/* z-index -1 comme body::before (photo locale) : placé après dans le DOM, il passe devant */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[-1]">
        {layers.map((p, i) =>
          p ? (
            <div
              key={i}
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms] ease-out"
              style={{ backgroundImage: `url("${p.url}")`, opacity: i === front ? 1 : 0 }}
            />
          ) : null,
        )}
        {/* voile léger : les photos varient (aube claire, nuit sombre), les chiffres restent lisibles */}
        {shown && <div className="absolute inset-0 bg-[rgba(10,16,22,0.38)]" />}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <ImageIcon className="h-3.5 w-3.5 shrink-0" />
        {shown ? (
          <a href={shown.page} target="_blank" rel="noreferrer" className="min-w-0 truncate hover:text-slate-300">
            {shown.title} · {shown.author}
            {shown.license ? ` · ${shown.license}` : ''} · Wikimedia Commons
          </a>
        ) : (
          <span>Fond d'écran local</span>
        )}
        <button
          onClick={() => void next()}
          disabled={busy}
          title="Changer de fond d'écran"
          aria-label="Changer de fond d'écran"
          className="shrink-0 rounded-full p-1 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </>
  );
}
