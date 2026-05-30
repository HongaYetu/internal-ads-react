import React, { useEffect, useRef, useState } from 'react';
import { useAdsContext } from '../context/AdsProvider';
import { useAd } from '../hooks/useAd';
import type { AdServeRequest, NativeAdData, NativeAdHelpers } from '../types';
import { toNativeAdData } from '../utils/toNativeAdData';

export type AdNativeSlotProps = AdServeRequest & {
  /**
   * Renderiza o card nativo com os dados do anúncio. Aplica `helpers.clickHref`
   * num `<a>` (modo proxy) ou `helpers.onPress` num botão (modo direct).
   * O selo "Anúncio." é overlay automático no canto sup. esquerdo.
   */
  renderCard: (data: NativeAdData, helpers: NativeAdHelpers) => React.ReactNode;
  /** Lazy mount via IntersectionObserver. Default: true. */
  lazy?: boolean;
  /** Classe + style do wrapper exterior (o card sai dentro). */
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
  /**
   * Default: 1000ms para imagem (IAB MRC). Configurável para testes ou casos
   * em que o consumer queira granularity própria.
   */
  impressionDelayMs?: number;
};

/**
 * Anúncio nativo — copia a estrutura visual dos itens da lista do consumer.
 *
 * O consumer fornece um `renderCard` que recebe `NativeAdData` (headline,
 * descrição, CTA, foto, logo, anunciante, url) e renderiza dentro do seu
 * próprio card (mesmo componente usado para produtos reais). O SDK trata:
 *
 * - 1 fetch `/serve` com `formatos` (idêntico ao `<AdSlot>`)
 * - Tracking de impressão (IAB MRC: ≥50% visível por 1s)
 * - Click via proxy GET nativo (modo proxy) — `<a href>` resistente a races
 * - Selo **Anúncio.** absoluto top-left (overlay, não pisa o card)
 * - No-fill: quando não há anúncio ou nenhum asset utilizável, devolve `null`
 */
export function AdNativeSlot(props: AdNativeSlotProps) {
  const {
    renderCard,
    lazy = true,
    wrapperClassName,
    wrapperStyle,
    impressionDelayMs,
    ...req
  } = props;

  const [visible, setVisible] = useState(!lazy);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Lazy mount — só dispara `/serve` quando o slot entra no viewport.
  useEffect(() => {
    if (visible || !lazy || !wrapperRef.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const node = wrapperRef.current;
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

  if (!visible) {
    return <div ref={wrapperRef} className={wrapperClassName} style={wrapperStyle} />;
  }

  return (
    <NativeAdInner
      req={req}
      renderCard={renderCard}
      wrapperClassName={wrapperClassName}
      wrapperStyle={wrapperStyle}
      impressionDelayMs={impressionDelayMs}
    />
  );
}

function NativeAdInner({
  req,
  renderCard,
  wrapperClassName,
  wrapperStyle,
  impressionDelayMs,
}: {
  req: AdServeRequest;
  renderCard: (data: NativeAdData, helpers: NativeAdHelpers) => React.ReactNode;
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
  impressionDelayMs?: number;
}) {
  const { anuncio, tokens, markImpression, markClick } = useAd(req);
  const { baseUrl, mode } = useAdsContext();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [intersecting, setIntersecting] = useState(false);
  const impressionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // IAB MRC — marca impressão quando ≥50% visível por `effectiveDelay` ms.
  useEffect(() => {
    if (!anuncio || !containerRef.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIntersecting(true);
      return;
    }
    const node = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setIntersecting(entry.isIntersecting && entry.intersectionRatio >= 0.5);
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [anuncio?.id]);

  useEffect(() => {
    if (!anuncio || !intersecting) {
      if (impressionTimer.current) {
        clearTimeout(impressionTimer.current);
        impressionTimer.current = null;
      }
      return;
    }
    const delay = impressionDelayMs ?? 1000;
    impressionTimer.current = setTimeout(() => {
      markImpression();
    }, delay);
    return () => {
      if (impressionTimer.current) {
        clearTimeout(impressionTimer.current);
        impressionTimer.current = null;
      }
    };
  }, [anuncio?.id, intersecting, impressionDelayMs, markImpression]);

  // Sem anúncio → no-fill (nada renderizado, ocupa 0px).
  if (!anuncio) {
    return null;
  }

  const data = toNativeAdData(anuncio);
  if (!data) {
    return null;
  }

  const useProxyClick = mode === 'proxy' && !!tokens?.click;
  const clickHref = useProxyClick
    ? `${baseUrl.replace(/\/+$/, '')}/click/${encodeURIComponent(tokens!.click)}`
    : null;

  const helpers: NativeAdHelpers = {
    clickHref,
    onPress: markClick,
  };

  return (
    <div
      ref={containerRef}
      className={wrapperClassName}
      style={{ position: 'relative', ...wrapperStyle }}
    >
      {renderCard(data, helpers)}
      <span style={adLabelStyle}>Anúncio.</span>
    </div>
  );
}

const adLabelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 6,
  left: 6,
  padding: '2px 6px',
  fontSize: 10,
  lineHeight: 1.2,
  fontWeight: 600,
  color: '#fff',
  backgroundColor: 'rgba(0, 0, 0, 0.55)',
  borderRadius: 3,
  letterSpacing: 0.2,
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 5,
};
