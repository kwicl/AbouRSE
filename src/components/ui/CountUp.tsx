import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { still, useSeen } from '../../lib/motion';

const DURATION = 0.8;

/**
 * Montant qui défile jusqu'à sa valeur quand il arrive à l'écran.
 * Hors écran il affiche la vraie valeur ; les lecteurs d'écran lisent seulement la valeur finale.
 */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [el, seen] = useSeen<HTMLSpanElement>();
  const shown = useRef(0);

  useLayoutEffect(() => {
    const node = el.current;
    if (!node) return;
    if (!seen) {
      node.textContent = format(value);
      return;
    }
    const write = (n: number) => {
      shown.current = n;
      node.textContent = format(n);
    };
    if (still() || shown.current === value) {
      write(value);
      return;
    }
    const state = { n: shown.current };
    write(state.n);
    const tween = gsap.to(state, {
      n: value,
      duration: DURATION,
      ease: 'power3.out',
      onUpdate: () => write(state.n),
      onComplete: () => write(value),
    });
    // filet de sécurité : un montant ne doit jamais rester figé à mi-course (onglet en veille)
    const safety = setTimeout(() => {
      tween.kill();
      write(value);
    }, DURATION * 1000 + 400);
    return () => {
      clearTimeout(safety);
      tween.kill();
    };
  }, [el, seen, value, format]);

  return (
    <>
      <span ref={el} aria-hidden="true" />
      <span className="sr-only select-none">{format(value)}</span>
    </>
  );
}
