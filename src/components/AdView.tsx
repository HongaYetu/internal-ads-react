import React, { useEffect, useRef, useState } from 'react';
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

  const { anuncio, loading, markImpression, markClick } = useAd(req);
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const style: React.CSSProperties = { ...imgStyle, aspectRatio };

  if (asset.tipo === 'imagem' && asset.url) {
    return (
      <img
        src={asset.url}
        alt={fallbackName}
        style={style}
        loading="lazy"
        decoding="async"
      />
    );
  }
  if (asset.tipo === 'video') {
    const src = asset.hls_url || asset.url || undefined;
    return (
      <video
        src={src}
        poster={asset.thumbnail_url ?? undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        style={style}
      />
    );
  }
  return <div style={fallbackStyle}>{fallbackName}</div>;
}

const imgStyle: React.CSSProperties = {
  width: '100%',
  height: 'auto',
  display: 'block',
  objectFit: 'cover',
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
