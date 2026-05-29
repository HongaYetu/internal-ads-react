import React, { createContext, useContext, useMemo } from 'react';
import { useDeviceId } from '../hooks/useDeviceId';
import type { AdsConfig, AdsMode } from '../types';

type AdsContextValue = {
  baseUrl: string;
  token?: string | null;
  mode: AdsMode;
  deviceId: string | null;
  debug: boolean;
};

const AdsContext = createContext<AdsContextValue | null>(null);

export type AdsProviderProps = {
  config: AdsConfig;
  children: React.ReactNode;
};

/**
 * Topo da árvore — encapsula a configuração e resolve o `device_id`.
 *
 * Recomendação de segurança: usa `mode: 'proxy'` para sites públicos.
 * Em modo direct, o token ConnectedProject fica embutido no bundle JS e pode
 * ser extraído pelo browser. Ver README para detalhes.
 */
export function AdsProvider({ config, children }: AdsProviderProps) {
  const deviceId = useDeviceId(config.deviceId ?? null);
  const value = useMemo<AdsContextValue>(
    () => ({
      baseUrl: config.baseUrl.replace(/\/+$/, ''),
      token: config.token ?? null,
      mode: config.mode ?? 'direct',
      deviceId,
      debug: config.debug ?? false,
    }),
    [config.baseUrl, config.token, config.mode, config.debug, deviceId],
  );

  if (value.debug && value.mode === 'direct' && typeof console !== 'undefined') {
    // eslint-disable-next-line no-console
    console.warn(
      '[@hongayetu/internal-ads-react] mode="direct" expõe o token no bundle. Considera mode="proxy".',
    );
  }

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

/** @internal */
export function useAdsContext(): AdsContextValue {
  const ctx = useContext(AdsContext);
  if (!ctx) {
    throw new Error(
      '[@hongayetu/internal-ads-react] useAd/AdView devem estar dentro de <AdsProvider>.',
    );
  }
  return ctx;
}
