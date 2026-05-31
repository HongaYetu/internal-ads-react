import React, { useCallback, useState } from 'react';
import { AdInterstitial, type AdInterstitialProps } from '../components/AdInterstitial';
import type { AdServeRequest } from '../types';

export type UseAdInterstitialResult = {
  /** Abre o interstitial. Idempotente — chamadas adicionais não fazem nada. */
  show: () => void;
  /** Fecha o interstitial (útil para reset manual). */
  hide: () => void;
  /** True enquanto o modal está visível. */
  isOpen: boolean;
  /** Inserir no JSX para o portal renderizar. */
  AdInterstitialPortal: React.ReactElement;
};

/**
 * Hook conveniente para apps que querem disparar interstitials imperativamente
 * — ex: cold start, pós-checkout, mudança de rota. Usa internamente o
 * componente `<AdInterstitial>`.
 *
 * @example
 * const { show, AdInterstitialPortal } = useAdInterstitial({
 *   espacoSlug: 'humbi_shop',
 *   sublocal: 'interstitial_pos_compra',
 *   formatos: [{ largura: 1080, altura: 1920 }],
 * });
 * useEffect(() => { show() }, []);
 * return <>{AdInterstitialPortal}{children}</>;
 */
export function useAdInterstitial(
  req: AdServeRequest,
  opcoes?: Pick<AdInterstitialProps, 'onPresented' | 'onSkip' | 'onCompleted' | 'zIndex'>,
): UseAdInterstitialResult {
  const [isOpen, setIsOpen] = useState(false);

  const show = useCallback(() => setIsOpen(true), []);
  const hide = useCallback(() => setIsOpen(false), []);

  const AdInterstitialPortal = React.createElement(AdInterstitial, {
    ...req,
    ...opcoes,
    open: isOpen,
    onClose: hide,
  });

  return { show, hide, isOpen, AdInterstitialPortal };
}
