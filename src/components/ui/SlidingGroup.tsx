import { useCallback, useLayoutEffect, useRef, type HTMLAttributes } from 'react';

/** Groupe de boutons avec une pilule qui glisse jusqu'au bouton `data-active`. */
export function SlidingGroup({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const box = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);

  const place = useCallback(() => {
    const p = pill.current;
    const b = box.current?.querySelector<HTMLElement>(':scope > button[data-active="true"]');
    if (!p) return;
    if (!b) {
      p.removeAttribute('data-ready');
      return;
    }
    p.style.width = `${b.offsetWidth}px`;
    p.style.height = `${b.offsetHeight}px`;
    p.style.transform = `translate(${b.offsetLeft}px, ${b.offsetTop}px)`;
    if (!p.hasAttribute('data-ready')) {
      // positionner avant d'activer la transition, sinon la pilule arrive du coin
      void p.offsetWidth;
      p.setAttribute('data-ready', '');
    }
  }, []);

  // à chaque rendu : la sélection ou l'ordre des boutons peut changer
  useLayoutEffect(place);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(place);
    ro.observe(el);
    el.querySelectorAll(':scope > button').forEach((b) => ro.observe(b));
    return () => ro.disconnect();
  }, [place]);

  return (
    <div ref={box} className={`seg ${className}`} {...rest}>
      <span ref={pill} className="seg-pill" aria-hidden="true" />
      {children}
    </div>
  );
}
