import React, { useEffect, useRef, useState } from 'react';
import { AdView, type AdViewProps } from './AdView';

export type AdSlotProps = AdViewProps & {
  /**
   * Altura reservada do skeleton (px) quando `formatos` não é fornecido.
   * Quando `formatos` está presente, a altura é derivada do primeiro formato
   * (proporcional à largura).
   */
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
 * Filosofia (v0.5+): o tamanho do slot **vem da prop `formatos`**, não da
 * medição do DOM. O consumer declara `formatos={[{largura:728,altura:90}]}`
 * e o slot reserva exactamente 728×90 (centrado no parent), faz 1 só fetch
 * com `formatos_aceites`, e a API devolve um asset desse tamanho ou no-fill.
 *
 * - **Lazy mount**: só chama `/serve` quando o slot entra no viewport.
 * - **Sem ResizeObserver**: nada de medição automática. Elimina o loop
 *   width→fetch→render→width que causava 5–7 requests por slot.
 * - **Collapse-on-empty**: 0px quando não há anúncio.
 * - **Sem `formatos`** (legacy): usa `reservedHeight` como altura e não envia
 *   slot dims — a API faz matching aproximado pelo lado dela.
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

  // Tamanho preferido derivado da prop `formatos`. O primeiro entry define a
  // "intenção visual" do slot — se a API devolver um asset de tamanho
  // diferente (porque consumer passou múltiplos formatos), o asset apenas
  // se ajusta dentro do max-width via aspect-ratio do próprio elemento.
  const primario = adProps.formatos?.[0] ?? null;

  // Debug: imprime no console quando o slot monta para que o consumer possa
  // verificar se `formatos` chegou.
  useEffect(() => {
    if (typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log('[hongayetu/ads] AdSlot mount', {
        espacoSlug: adProps.espacoSlug,
        sublocal: adProps.sublocal,
        formatos: adProps.formatos,
        primario,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Estilo do wrapper externo. Quando temos `formatos`, fixamos a largura
  // (max-width) e proporção exactas; o slot fica centrado no parent.
  const intrinsicStyle: React.CSSProperties = primario
    ? {
        width: '100%',
        maxWidth: primario.largura,
        aspectRatio: `${primario.largura} / ${primario.altura}`,
        marginLeft: 'auto',
        marginRight: 'auto',
      }
    : { height: reservedHeight };

  // Skeleton lazy — observer activo via ref para apanhar viewport.
  if (lazy && !visible) {
    return (
      <div
        ref={ref}
        className={wrapperClassName}
        style={{
          ...intrinsicStyle,
          backgroundColor: skeletonColor,
          borderRadius: 8,
          ...wrapperStyle,
        }}
      />
    );
  }

  return (
    <div
      ref={ref}
      className={wrapperClassName}
      style={{ ...intrinsicStyle, ...wrapperStyle }}
    >
      <AdView
        {...adProps}
        renderLoading={() => (
          <div
            style={{
              width: '100%',
              height: '100%',
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
