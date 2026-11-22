import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** pas d'animation si l'appareil demande moins de mouvement, ou si la page est masquée */
export const still = () => document.hidden || reduced();

/**
 * Appelle `onEnter` une seule fois par élément, quand il arrive réellement à l'écran.
 * Une app installée peut démarrer masquée (lancement, restauration) : on attend qu'elle s'affiche.
 */
function watchEnter(els: Element[], onEnter: (entered: Element[]) => void, amount = 0): () => void {
  const pending = new Set(els);
  const io = new IntersectionObserver((entries) => {
    if (document.hidden) return;
    const entered = entries.filter((e) => e.isIntersecting && e.intersectionRatio >= amount && pending.has(e.target)).map((e) => e.target);
    entered.forEach((el) => {
      pending.delete(el);
      io.unobserve(el);
    });
    if (entered.length) onEnter(entered);
  }, { threshold: amount });
  const observe = () => {
    if (document.hidden) return;
    io.disconnect();
    pending.forEach((el) => io.observe(el));
  };
  observe();
  document.addEventListener('visibilitychange', observe);
  return () => {
    io.disconnect();
    document.removeEventListener('visibilitychange', observe);
  };
}

/** `true` à partir du moment où la part `amount` de l'élément a été vue : sur téléphone, presque tout est sous la ligne de flottaison. */
export function useSeen<T extends Element>(amount = 0): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    // déjà à l'écran (changement de période, par exemple) : démarrer avant la première image
    const r = el.getBoundingClientRect();
    // pas innerHeight : sur mobile il grandit le temps qu’un contenu trop large soit redimensionné
    const visible = Math.min(r.bottom, document.documentElement.clientHeight) - Math.max(r.top, 0);
    if (!document.hidden && el.getClientRects().length && visible > r.height * amount) {
      setSeen(true);
      return;
    }
    return watchEnter([el], () => setSeen(true), amount);
  }, [seen, amount]);

  return [ref, seen];
}

/**
 * Entrée de la barre du haut, puis de chaque section et de chaque ligne quand elle arrive à l'écran.
 * Rien n'est masqué à l'avance : si une animation ne démarre pas, le contenu reste visible.
 */
export function useEntrance(root: RefObject<HTMLElement>) {
  useGSAP(
    (_, contextSafe) => {
      const el = root.current;
      if (!el || !contextSafe || reduced()) return;

      const from = { opacity: 0, ease: 'power3.out', clearProps: 'transform,opacity' };
      if (!document.hidden) gsap.from(el.querySelector(':scope > header'), { ...from, y: -18, duration: 0.5 });

      const reveal = contextSafe((targets: Element[]) => {
        if (still()) return;
        targets.forEach((target, i) => {
          const row = target.hasAttribute('data-enter');
          gsap.from(target, { ...from, y: row ? 16 : 22, duration: row ? 0.5 : 0.6, delay: Math.min(i * 0.07, 0.3) });
        });
      });

      return watchEnter([...el.querySelectorAll('main > section, main [data-enter]')], reveal);
    },
    { scope: root },
  );
}

/** tour complet de l'icône au toucher (`:active` est trop bref, et peu fiable sur iPhone) */
export function spinIcon(button: HTMLElement) {
  if (still()) return;
  button.querySelector('svg')?.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
    duration: 600,
    easing: 'cubic-bezier(0.24, 0.89, 0.26, 1)',
  });
}
