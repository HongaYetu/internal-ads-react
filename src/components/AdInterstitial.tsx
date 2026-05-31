import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAd } from '../hooks/useAd';
import type { AdServeRequest } from '../types';

export type AdInterstitialProps = AdServeRequest & {
  open: boolean;
  onClose: () => void;
  onPresented?: () => void;
  onSkip?: () => void;
  onCompleted?: () => void;
  zIndex?: number;
};

const FREQ_KEY = (espaco: string, sublocal: string | null | undefined): string =>
  `@hongayetu/ads/freq/${espaco}/${sublocal ?? '_'}`;

const LAST_SHOWN_KEY = (espaco: string, sublocal: string | null | undefined): string =>
  `@hongayetu/ads/lastShown/${espaco}/${sublocal ?? '_'}`;

type FreqEntry = { count: number; date: string };

function lerFreq(key: string): FreqEntry {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    if (!raw) return { count: 0, date: '' };
    const parsed = JSON.parse(raw) as FreqEntry;
    const hoje = new Date().toISOString().slice(0, 10);
    if (parsed.date !== hoje) return { count: 0, date: hoje };
    return parsed;
  } catch {
    return { count: 0, date: '' };
  }
}

function incFreq(key: string): void {
  try {
    const atual = lerFreq(key);
    const hoje = new Date().toISOString().slice(0, 10);
    const novo: FreqEntry = { count: atual.count + 1, date: hoje };
    window.localStorage.setItem(key, JSON.stringify(novo));
  } catch {
    // localStorage indisponível — ignorar
  }
}

function lerLastShownMs(key: string): number {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    return raw ? Number.parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function gravarLastShownMs(key: string): void {
  try {
    window.localStorage.setItem(key, String(Date.now()));
  } catch {
    // ignore
  }
}

/**
 * Anúncio intersticial (modal full-screen) suportando imagem ou vídeo HTML5.
 *
 * - Política (skip_after_ms, frequency_cap_dia, interstitial_min_view_ms)
 *   vem do servidor via `useAd().politica` — o consumer não a configura.
 * - Tracking de vídeo (start, quartil_25/50/75, complete) automático via
 *   eventos do `<video>`.
 * - `skip` e `close` registados separadamente como `markVideoEvent('skip')`
 *   / `'close'` (mesmo para anúncios estáticos).
 */
export function AdInterstitial(props: AdInterstitialProps) {
  const { open, onClose, onPresented, onSkip, onCompleted, zIndex = 9999, ...req } = props;

  const {
    anuncio,
    politica,
    loading,
    markImpression,
    markClick,
    markVideoEvent,
  } = useAd(req);

  const [montadoEmMs, setMontadoEmMs] = useState<number | null>(null);
  const [agoraMs, setAgoraMs] = useState<number>(() => Date.now());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fechouRef = useRef(false);

  const asset = anuncio?.assets?.[0] ?? null;
  const ehVideo = asset?.tipo === 'video';
  const videoSrc = asset?.mp4_url || asset?.url || asset?.hls_url || '';

  // Frequency cap + cooldown client-side
  const freqKey = FREQ_KEY(req.espacoSlug, req.sublocal);
  const lastShownKey = LAST_SHOWN_KEY(req.espacoSlug, req.sublocal);
  const cap = politica?.frequency_cap_dia ?? Infinity;
  const cooldownMs = (politica?.intervalo_minimo_segundos ?? 0) * 1000;

  // Quando abre e anúncio disponível: marca presented + arranque do timer
  useEffect(() => {
    if (!open) {
      setMontadoEmMs(null);
      fechouRef.current = false;
      return;
    }
    if (loading) return;
    if (!anuncio || !asset) {
      // Sem fill — fecha imediatamente
      if (!fechouRef.current) {
        fechouRef.current = true;
        onClose();
      }
      return;
    }
    // Cap diário esgotado — não mostra
    const freq = lerFreq(freqKey);
    if (freq.count >= cap) {
      if (!fechouRef.current) {
        fechouRef.current = true;
        onClose();
      }
      return;
    }
    // Cooldown desde última exibição não passou — não mostra
    if (cooldownMs > 0) {
      const lastMs = lerLastShownMs(lastShownKey);
      if (lastMs > 0 && Date.now() - lastMs < cooldownMs) {
        if (!fechouRef.current) {
          fechouRef.current = true;
          onClose();
        }
        return;
      }
    }
    setMontadoEmMs(Date.now());
    incFreq(freqKey);
    gravarLastShownMs(lastShownKey);
    onPresented?.();
    if (!ehVideo) {
      // Estático: marca impressão após 1s
      const t = setTimeout(() => markImpression(), 1000);
      return () => clearTimeout(t);
    }
  }, [open, loading, anuncio?.id, asset?.id, cap, cooldownMs, ehVideo, freqKey, lastShownKey, markImpression, onClose, onPresented]);

  // Tick para atualizar countdown
  useEffect(() => {
    if (!open || montadoEmMs === null) return;
    const id = setInterval(() => setAgoraMs(Date.now()), 250);
    return () => clearInterval(id);
  }, [open, montadoEmMs]);

  const elapsedMs = montadoEmMs ? agoraMs - montadoEmMs : 0;
  const skipDisponivel = elapsedMs >= (politica?.skip_after_ms ?? 5000);
  const fecharDisponivel = elapsedMs >= (politica?.interstitial_min_view_ms ?? 0);

  const cuartisMarcados = useRef<{ q25: boolean; q50: boolean; q75: boolean }>({
    q25: false,
    q50: false,
    q75: false,
  });

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const pct = v.currentTime / v.duration;
    const pos = Math.floor(v.currentTime * 1000);
    if (pct >= 0.25 && !cuartisMarcados.current.q25) {
      cuartisMarcados.current.q25 = true;
      markVideoEvent('quartil_25', pos);
    }
    if (pct >= 0.5 && !cuartisMarcados.current.q50) {
      cuartisMarcados.current.q50 = true;
      markVideoEvent('quartil_50', pos);
    }
    if (pct >= 0.75 && !cuartisMarcados.current.q75) {
      cuartisMarcados.current.q75 = true;
      markVideoEvent('quartil_75', pos);
    }
  }, [markVideoEvent]);

  const handlePlay = useCallback(() => {
    markImpression();
    markVideoEvent('start', 0);
  }, [markImpression, markVideoEvent]);

  const handleEnded = useCallback(() => {
    markVideoEvent('complete');
    onCompleted?.();
  }, [markVideoEvent, onCompleted]);

  const handleSkip = useCallback(() => {
    const v = videoRef.current;
    markVideoEvent('skip', v ? Math.floor(v.currentTime * 1000) : undefined);
    onSkip?.();
    onClose();
  }, [markVideoEvent, onClose, onSkip]);

  const handleClose = useCallback(() => {
    const v = videoRef.current;
    markVideoEvent('close', v ? Math.floor(v.currentTime * 1000) : undefined);
    onClose();
  }, [markVideoEvent, onClose]);

  const handleCtaClick = useCallback(() => {
    markClick();
    onClose();
  }, [markClick, onClose]);

  const portalTarget = useMemo(
    () => (typeof document !== 'undefined' ? document.body : null),
    [],
  );

  if (!open || !portalTarget) return null;
  if (loading || !anuncio || !asset) return null;

  const conteudo = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.95)',
        zIndex,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="dialog"
      aria-label="Anúncio"
    >
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: '#fff',
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        Anúncio.
      </div>

      <div style={{ maxWidth: '100vw', maxHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
        {ehVideo ? (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={asset.thumbnail_url ?? undefined}
            autoPlay
            playsInline
            muted={false}
            controls={false}
            onPlay={handlePlay}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            style={{ maxWidth: '100vw', maxHeight: '100vh', objectFit: 'contain' }}
          />
        ) : (
          <img
            src={asset.url ?? ''}
            alt={asset.texto_titulo ?? anuncio.nome}
            style={{ maxWidth: '100vw', maxHeight: '100vh', objectFit: 'contain' }}
          />
        )}
      </div>

      {asset.texto_cta && (
        <button
          type="button"
          onClick={handleCtaClick}
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 28px',
            backgroundColor: '#f97316',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          {asset.texto_cta}
        </button>
      )}

      {skipDisponivel ? (
        <button
          type="button"
          onClick={handleSkip}
          style={{
            position: 'absolute',
            top: 12,
            right: 56,
            padding: '6px 12px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Skip Anúncio
        </button>
      ) : (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 56,
            padding: '6px 12px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: 'rgba(255,255,255,0.7)',
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {Math.max(0, Math.ceil(((politica?.skip_after_ms ?? 5000) - elapsedMs) / 1000))}s
        </div>
      )}

      <button
        type="button"
        onClick={fecharDisponivel ? handleClose : undefined}
        disabled={!fecharDisponivel}
        aria-label="Fechar"
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: fecharDisponivel ? '#fff' : 'rgba(255,255,255,0.3)',
          border: 'none',
          cursor: fecharDisponivel ? 'pointer' : 'not-allowed',
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        ×
      </button>
    </div>
  );

  return createPortal(conteudo, portalTarget);
}
