import { useEffect, useState } from 'react';

/**
 * Acompanha o `DOMRect` do primeiro elemento que bate com `selector`. Usa
 * `ResizeObserver` no nó alvo + `window.resize` como fallback para mudanças
 * que não disparam o observer (ex: scroll que muda layout).
 *
 * Devolve `null` enquanto o elemento não existe (típico em SSR ou se o
 * seletor não bate).
 *
 * @param selector CSS selector (ex: `'main'`, `'#app-content'`, `'[data-content]'`).
 */
export function useContentBounds(selector: string): DOMRect | null {
  const [bounds, setBounds] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const node = document.querySelector(selector) as HTMLElement | null;
    if (!node) {
      setBounds(null);
      return;
    }

    const update = () => {
      setBounds(node.getBoundingClientRect());
    };

    update();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(update);
      observer.observe(node);
    }
    window.addEventListener('resize', update);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [selector]);

  return bounds;
}
