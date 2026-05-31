import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdsContext } from '../context/AdsProvider';
import * as api from '../api/client';
import type {
  Anuncio,
  AdServeRequest,
  AdTokens,
  PoliticaInterstitial,
  VideoEvent,
} from '../types';

export type UseAdState = {
  anuncio: Anuncio | null;
  tokens: AdTokens | null;
  /** Política do slot (skip/cap/min_view). Só populada quando o sublocal/espaço tem config explícita. */
  politica: PoliticaInterstitial | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  markImpression: () => Promise<void>;
  markClick: () => Promise<void>;
  markVideoEvent: (event: VideoEvent, positionMs?: number) => Promise<void>;
};

/**
 * Hook principal. Faz `/serve` à API v2; retorna anúncio + handlers
 * `markImpression` (idempotente), `markClick` (redirect via window.location)
 * e `markVideoEvent` (idempotente por evento — útil para interstitials).
 */
export function useAd(req: AdServeRequest): UseAdState {
  const { baseUrl, token, deviceId, debug } = useAdsContext();
  const [anuncio, setAnuncio] = useState<Anuncio | null>(null);
  const [tokens, setTokens] = useState<AdTokens | null>(null);
  const [politica, setPolitica] = useState<PoliticaInterstitial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const impressionMarked = useRef(false);
  const videoEventsMarked = useRef<Set<VideoEvent>>(new Set());

  const espacoSlug = req.espacoSlug;
  const formatoId = req.formatoId ?? null;
  const sublocal = req.sublocal ?? null;
  const slotWidth = req.slotWidth ?? null;
  const slotHeight = req.slotHeight ?? null;
  const userAge = req.userAge ?? null;
  const geoCountry = req.geoCountry ?? null;
  // Serialização estável para dep da `useCallback` — array de objectos quebraria
  // a comparação por referência a cada render.
  const formatosKey = req.formatos ? JSON.stringify(req.formatos) : '';

  const enabled = req.enabled !== false;
  const fetchAd = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (!deviceId) return;
    setLoading(true);
    setError(null);
    impressionMarked.current = false;
    videoEventsMarked.current = new Set();
    try {
      const data = await api.serve(
        { baseUrl, token, deviceId },
        {
          espacoSlug,
          formatoId,
          sublocal,
          userAge,
          geoCountry,
          slotWidth,
          slotHeight,
          formatos: formatosKey ? (JSON.parse(formatosKey) as { largura: number; altura: number }[]) : null,
        },
      );
      if (!data) {
        setAnuncio(null);
        setTokens(null);
        setPolitica(null);
      } else {
        setAnuncio(data.anuncio);
        setTokens(data.tokens);
        setPolitica(data.politica ?? null);
      }
    } catch (e) {
      if (debug) {
        // eslint-disable-next-line no-console
        console.warn('[hongayetu/ads] serve falhou:', e);
      }
      setError(e as Error);
      setAnuncio(null);
      setTokens(null);
      setPolitica(null);
    } finally {
      setLoading(false);
    }
  }, [
    baseUrl,
    token,
    deviceId,
    espacoSlug,
    formatoId,
    sublocal,
    userAge,
    geoCountry,
    slotWidth,
    slotHeight,
    formatosKey,
    debug,
    enabled,
  ]);

  useEffect(() => {
    fetchAd();
  }, [fetchAd]);

  const markImpression = useCallback(async () => {
    if (!tokens?.impression || impressionMarked.current) return;
    impressionMarked.current = true;
    try {
      await api.trackImpression({ baseUrl, token, deviceId }, tokens.impression);
    } catch (e) {
      impressionMarked.current = false;
      if (debug) {
        // eslint-disable-next-line no-console
        console.warn('[hongayetu/ads] impressão falhou:', e);
      }
    }
  }, [baseUrl, token, deviceId, tokens?.impression, debug]);

  const markClick = useCallback(async () => {
    if (!tokens?.click) return;
    try {
      const res = await api.trackClick({ baseUrl, token, deviceId }, tokens.click);
      const url = res?.redirect_url ?? anuncio?.url;
      if (url && typeof window !== 'undefined') {
        window.location.href = url;
      }
    } catch (e) {
      if (debug) {
        // eslint-disable-next-line no-console
        console.warn('[hongayetu/ads] clique falhou:', e);
      }
    }
  }, [baseUrl, token, deviceId, tokens?.click, anuncio?.url, debug]);

  const markVideoEvent = useCallback(
    async (event: VideoEvent, positionMs?: number) => {
      if (!tokens?.impression) return;
      if (videoEventsMarked.current.has(event)) return;
      videoEventsMarked.current.add(event);
      try {
        await api.trackVideoEvent(
          { baseUrl, token, deviceId },
          tokens.impression,
          event,
          positionMs,
        );
      } catch (e) {
        videoEventsMarked.current.delete(event);
        if (debug) {
          // eslint-disable-next-line no-console
          console.warn('[hongayetu/ads] video event falhou:', event, e);
        }
      }
    },
    [baseUrl, token, deviceId, tokens?.impression, debug],
  );

  return {
    anuncio,
    tokens,
    politica,
    loading,
    error,
    refresh: fetchAd,
    markImpression,
    markClick,
    markVideoEvent,
  };
}
