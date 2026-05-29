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

const SIZE_DRIFT_THRESHOLD = 0.1; // 10%

/**
 * Wrapper recomendado para inserção em páginas/listas.
 *
 * - **Lazy mount**: só chama `/serve` quando o slot entra no viewport.
 * - **Skeleton com altura reservada** para evitar layout shift (CLS).
 * - **Auto-medição**: ResizeObserver mede o container e passa `slotWidth/slotHeight`
 *   ao `<AdView>` para a API escolher o asset com dimensões mais próximas. Refetch
 *   só quando o tamanho mudar ≥10% (debounce 300ms).
 * - **Collapse-on-empty**: 0px quando não há anúncio.
 */
export function AdSlot(props: AdSlotProps) {
  const {
    reservedHeight = 180,
    lazy = true,
    skeletonColor = '#f3f4f6',
    wrapperClassName,
    wrapperStyle,
    slotWidth: slotWidthOverride,
    slotHeight: slotHeightOverride,
    ...adProps
  } = props;

  const [visible, setVisible] = useState(!lazy);
  const [size, setSize] = useState<{ w: number; h: number } | null>(() =>
    slotWidthOverride && slotHeightOverride
      ? { w: slotWidthOverride, h: slotHeightOverride }
      : null,
  );
  const ref = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // IntersectionObserver — lazy mount.
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

  // ResizeObserver — mede dimensões reais. Override manual via props tem
  // prioridade. Debounce 300ms e threshold 10% para evitar refetch excessivo.
  useEffect(() => {
    if (slotWidthOverride && slotHeightOverride) return;
    if (!ref.current) return;
    if (typeof ResizeObserver === 'undefined') {
      const rect = ref.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
      }
      return;
    }
    const node = ref.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      if (w <= 0 || h <= 0) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSize((prev) => {
          if (!prev) return { w, h };
          const dw = Math.abs(w - prev.w) / Math.max(w, prev.w);
          const dh = Math.abs(h - prev.h) / Math.max(h, prev.h);
          if (dw < SIZE_DRIFT_THRESHOLD && dh < SIZE_DRIFT_THRESHOLD) {
            return prev; // mudança insignificante — não força refetch
          }
          return { w, h };
        });
      }, 300);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [slotWidthOverride, slotHeightOverride]);

  // Skeleton lazy — observer ainda activo via ref para apanhar viewport.
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
        slotWidth={slotWidthOverride ?? size?.w ?? null}
        slotHeight={slotHeightOverride ?? size?.h ?? null}
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
