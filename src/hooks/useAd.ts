import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdsContext } from '../context/AdsProvider';
import * as api from '../api/client';
import type { Anuncio, AdServeRequest, AdTokens } from '../types';

export type UseAdState = {
  anuncio: Anuncio | null;
  tokens: AdTokens | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  markImpression: () => Promise<void>;
  markClick: () => Promise<void>;
};

/**
 * Hook principal. Faz `/serve` à API v2; retorna anúncio + handlers
 * `markImpression` (idempotente) e `markClick` (redirect via window.location).
 */
export function useAd(req: AdServeRequest): UseAdState {
  const { baseUrl, token, deviceId, debug } = useAdsContext();
  const [anuncio, setAnuncio] = useState<Anuncio | null>(null);
  const [tokens, setTokens] = useState<AdTokens | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const impressionMarked = useRef(false);

  const espacoSlug = req.espacoSlug;
  const formatoId = req.formatoId ?? null;
  const sublocal = req.sublocal ?? null;
  const slotWidth = req.slotWidth ?? null;
  const slotHeight = req.slotHeight ?? null;
  const userAge = req.userAge ?? null;
  const geoCountry = req.geoCountry ?? null;

  const fetchAd = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    setError(null);
    impressionMarked.current = false;
    try {
      const data = await api.serve(
        { baseUrl, token, deviceId },
        { espacoSlug, formatoId, sublocal, userAge, geoCountry, slotWidth, slotHeight },
      );
      if (!data) {
        setAnuncio(null);
        setTokens(null);
      } else {
        setAnuncio(data.anuncio);
        setTokens(data.tokens);
      }
    } catch (e) {
      if (debug) {
        // eslint-disable-next-line no-console
        console.warn('[hongayetu/ads] serve falhou:', e);
      }
      setError(e as Error);
      setAnuncio(null);
      setTokens(null);
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
    debug,
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

  return {
    anuncio,
    tokens,
    loading,
    error,
    refresh: fetchAd,
    markImpression,
    markClick,
  };
}
