import React, { useEffect, useRef, useState } from 'react';
import { AdView, type AdViewProps } from './AdView';

export type AdSlotProps = AdViewProps & {
  /** Altura reservada do skeleton (px). Default: 180. */
  reservedHeight?: number;
  /** Lazy mount via IntersectionObserver. Default: true. */
  lazy?: boolean;
  /** Cor do skeleton. */
  skeletonColor?: string;
  /** Classe + style do container exterior. */
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
};

/**
 * Wrapper recomendado para inserção em páginas/listas.
 *
 * - **Lazy mount**: só chama `/serve` quando o slot entra no viewport.
 * - **Skeleton com altura reservada** para evitar layout shift (CLS).
 * - **Collapse-on-empty**: 0px quando não há anúncio.
 */
export function AdSlot(props: AdSlotProps) {
  const {
    reservedHeight = 180,
    lazy = true,
    skeletonColor = '#f3f4f6',
    wrapperClassName,
    wrapperStyle,
    ...adProps
  } = props;

  const [visible, setVisible] = useState(!lazy);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (visible || !lazy || !ref.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const node = ref.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, lazy]);

  if (lazy && !visible) {
    return (
      <div
        ref={ref}
        className={wrapperClassName}
        style={{
          height: reservedHeight,
          backgroundColor: skeletonColor,
          borderRadius: 8,
          ...wrapperStyle,
        }}
      />
    );
  }

  return (
    <div ref={ref} className={wrapperClassName} style={wrapperStyle}>
      <AdView
        {...adProps}
        renderLoading={() => (
          <div
            style={{
              height: reservedHeight,
              backgroundColor: skeletonColor,
              borderRadius: 8,
            }}
          />
        )}
        renderEmpty={() => null}
      />
    </div>
  );
}
