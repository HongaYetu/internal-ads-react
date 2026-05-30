import React, { useEffect, useRef, useState } from 'react';
import { useAdsContext } from '../context/AdsProvider';
import { useAd } from '../hooks/useAd';
import type { AdAsset, AdServeRequest, Anuncio } from '../types';

export type AdViewProps = AdServeRequest & {
  className?: string;
  style?: React.CSSProperties;
  /** Render custom (override total). */
  renderAd?: (anuncio: Anuncio) => React.ReactNode;
  /** Render quando não há anúncio para o espaço. */
  renderEmpty?: () => React.ReactNode;
  /** Render durante o carregamento. */
  renderLoading?: () => React.ReactNode;
  /**
   * Default: 1000ms para imagem, 2000ms para vídeo (alinha com IAB MRC).
   */
  impressionDelayMs?: number;
};

export function AdView(props: AdViewProps) {
  const {
    className,
    style,
    renderAd,
    renderEmpty,
    renderLoading,
    impressionDelayMs,
    ...req
  } = props;

  const { anuncio, tokens, loading, markImpression, markClick } = useAd(req);
  const { baseUrl, mode } = useAdsContext();
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modo proxy → click é GET nativo via `<a href>`: o browser navega para o
  // proxy (nova aba), o proxy regista server-side e devolve 302 para a URL
  // destino. Funciona com middle-click, Cmd-click, é resistente a adblockers
  // e elimina race entre `fetch` e `window.location.href` que estavam a
  // perder cliques.
  const useNativeAnchor = mode === 'proxy' && !!tokens?.click;
  const clickHref = useNativeAnchor
    ? `${baseUrl.replace(/\/+$/, '')}/click/${encodeURIComponent(tokens!.click)}`
    : undefined;

  // Visibility tracking via IntersectionObserver — só marca impressão se >=50%
  // visível por `effectiveDelay` ms (IAB MRC standard).
  useEffect(() => {
    if (!anuncio || !containerRef.current) return;
    const node = containerRef.current;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5);
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [anuncio?.id]);

  const asset = anuncio?.assets?.[0];
  const effectiveDelay =
    impressionDelayMs ?? (asset?.tipo === 'video' ? 2000 : 1000);

  useEffect(() => {
    if (!anuncio || !visible) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setTimeout(() => {
      markImpression();
    }, effectiveDelay);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [anuncio?.id, visible, effectiveDelay, markImpression]);

  if (loading) {
    if (renderLoading) {
      return <>{renderLoading()}</>;
    }
    return (
      <div ref={containerRef} className={className} style={style}>
        <div style={{ ...skeletonStyle, ...style }} />
      </div>
    );
  }

  if (!anuncio) {
    if (renderEmpty) {
      return <>{renderEmpty()}</>;
    }
    return null;
  }

  if (renderAd) {
    if (useNativeAnchor) {
      return (
        <a
          ref={containerRef as React.Ref<HTMLAnchorElement>}
          className={className}
          style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit', ...style }}
          href={clickHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          {renderAd(anuncio)}
        </a>
      );
    }

    return (
      <div
        ref={containerRef}
        className={className}
        style={{ cursor: 'pointer', ...style }}
        onClick={markClick}
      >
        {renderAd(anuncio)}
      </div>
    );
  }

  if (useNativeAnchor) {
    return (
      <a
        ref={containerRef as React.Ref<HTMLAnchorElement>}
        className={className}
        style={{ cursor: 'pointer', overflow: 'hidden', textDecoration: 'none', color: 'inherit', display: 'block', ...style }}
        href={clickHref}
        target="_blank"
        rel="noopener noreferrer"
      >
        {renderAsset(asset, anuncio.nome)}
      </a>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ cursor: 'pointer', overflow: 'hidden', ...style }}
      onClick={markClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          markClick();
        }
      }}
    >
      {renderAsset(asset, anuncio.nome)}
    </div>
  );
}

function renderAsset(asset: AdAsset | undefined, fallbackName: string): React.ReactNode {
  if (!asset) {
    return <div style={fallbackStyle}>{fallbackName}</div>;
  }
  const aspectRatio =
    asset.largura && asset.altura ? `${asset.largura} / ${asset.altura}` : '16 / 9';
  // Nunca escalar acima do tamanho natural do asset — evita banners enormes
  // quando o slot é mais largo do que a criatividade. Quando o slot é mais
  // estreito, a regra `width: 100%` faz o asset encolher proporcionalmente.
  const style: React.CSSProperties = {
    ...imgStyle,
    aspectRatio,
    ...(asset.largura ? { maxWidth: asset.largura } : null),
    ...(asset.altura ? { maxHeight: asset.altura } : null),
  };

  const media =
    asset.tipo === 'imagem' && asset.url ? (
      <img
        src={asset.url}
        alt={fallbackName}
        style={style}
        loading="lazy"
        decoding="async"
      />
    ) : asset.tipo === 'video' ? (
      <video
        src={asset.hls_url || asset.url || undefined}
        poster={asset.thumbnail_url ?? undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        style={style}
      />
    ) : (
      <div style={fallbackStyle}>{fallbackName}</div>
    );

  // Centramos no eixo horizontal — quando o slot é mais largo que o asset
  // (já limitado por maxWidth), o ad fica centrado em vez de encostado à
  // esquerda. Disclosure "Anúncio." é sobreposto no canto superior esquerdo
  // do próprio asset (não do slot vazio).
  const innerWrapStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    ...(asset.largura ? { maxWidth: asset.largura } : null),
    width: '100%',
  };

  return (
    <div style={centerWrapperStyle}>
      <div style={innerWrapStyle}>
        {media}
        <span style={adLabelStyle}>Anúncio.</span>
      </div>
    </div>
  );
}

const imgStyle: React.CSSProperties = {
  width: '100%',
  height: 'auto',
  display: 'block',
  objectFit: 'contain',
  margin: '0 auto',
};

const centerWrapperStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const fallbackStyle: React.CSSProperties = {
  padding: 16,
  backgroundColor: '#f3f4f6',
  color: '#374151',
  fontWeight: 600,
  textAlign: 'center',
};

const skeletonStyle: React.CSSProperties = {
  width: '100%',
  aspectRatio: '16 / 9',
  backgroundColor: '#f3f4f6',
  borderRadius: 8,
};

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
  zIndex: 2,
  textTransform: 'none',
};
