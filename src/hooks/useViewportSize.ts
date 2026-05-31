import { useEffect, useState } from 'react';

/**
 * Acompanha o tamanho do viewport (`window.innerWidth/Height`). Re-renderiza
 * em `resize`. Usado pelo `<AdAuto>` para decidir hide/show conforme breakpoint.
 *
 * SSR-safe: durante o render no servidor (sem `window`) devolve `{ width: 0,
 * height: 0 }`. O consumer deve tratar esse caso como "não decidir ainda".
 */
export function useViewportSize(): { width: number; height: number } {
  const [size, setSize] = useState(() => ({
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return size;
}
