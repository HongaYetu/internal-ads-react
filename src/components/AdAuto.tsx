import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AdView } from './AdView';
import { useViewportSize } from '../hooks/useViewportSize';
import { useContentBounds } from '../hooks/useContentBounds';
import type { AdServeRequest } from '../types';

export type AdAutoPosition =
  | 'direita'
  | 'esquerda'
  | 'topo'
  | 'rodape'
  | 'meio_conteudo';

export type AdAutoProps = AdServeRequest & {
  position: AdAutoPosition;
  /**
   * Seletor CSS do container principal de conteúdo. Default `'main'`.
   * - `direita`/`esquerda`: usado para calcular o espaço lateral livre.
   * - `meio_conteudo`: usado como destino do portal.
   */
  contentSelector?: string;
  /**
   * Distância em px entre o slot e a borda mais próxima (conteúdo ou viewport).
   * Default 20.
   */
  gap?: number;
  /**
   * Forçar `position: fixed` (sticky no viewport).
   *
   * Default: `true` para `direita|esquerda` (side rails só fazem sentido fixed);
   * `false` para `topo|rodape|meio_conteudo` (vivem inline no fluxo do documento).
   *
   * Passa `sticky={true}` em `topo`/`rodape` para o anchor clássico AdSense
   * com `padding-top/padding-bottom` reservado no body.
   */
  sticky?: boolean;
  /**
   * Esconder em viewports estreitos. Default: true para `direita|esquerda`.
   */
  hideOnMobile?: boolean;
  /** Z-index do slot fixed. Default 40. */
  zIndex?: number;
  /** Largura mínima do viewport para "mobile" em pixels. Default 768. */
  mobileBreakpoint?: number;
  /**
   * Para `meio_conteudo`: índice do filho do `contentSelector` antes do qual
   * injetar. Default: meio dos filhos.
   */
  insertAtIndex?: number;
};

/**
 * `<AdAuto>` — anúncios automáticos posicionados em sticky/inline conforme
 * a `position` escolhida. Equivalente simplificado aos AdSense Auto Ads.
 *
 * Comportamento:
 * - `direita`/`esquerda`: `position: fixed` colado ao lado do `contentSelector`.
 *   Esconde automaticamente quando o espaço lateral livre é menor que a
 *   largura do `formatos[0]`.
 * - `topo`/`rodape`: anchor sticky full-width. Reserva espaço no body via
 *   `padding-top`/`padding-bottom` para evitar overlap.
 * - `meio_conteudo`: injeta inline via portal no `contentSelector` (default
 *   no meio dos filhos).
 *
 * Reusa `<AdView>` por baixo, logo todo o tracking IAB/click/política está
 * incluído.
 */
export function AdAuto(props: AdAutoProps) {
  const {
    position,
    contentSelector = 'main',
    gap = 20,
    sticky: stickyProp,
    hideOnMobile: hideOnMobileProp,
    zIndex = 40,
    mobileBreakpoint = 768,
    insertAtIndex,
    ...req
  } = props;

  // Default: side rails são `fixed` (única forma sensata de viverem nas
  // laterais sem afetar o layout). Anchor `topo`/`rodape` e `meio_conteudo`
  // vivem inline no fluxo do documento por defeito — o consumer escolhe onde
  // colocar o `<AdAuto>` no JSX e a posição efetiva resulta daí. Passa
  // `sticky={true}` se quiseres o comportamento sticky (top:0/bottom:0).
  const sticky = stickyProp ?? (position === 'direita' || position === 'esquerda');
  const hideOnMobile = hideOnMobileProp ?? (position === 'direita' || position === 'esquerda');

  const viewport = useViewportSize();
  const contentBounds = useContentBounds(contentSelector);

  const primario = req.formatos?.[0] ?? null;
  const slotWidth = primario?.largura ?? 0;
  const slotHeight = primario?.altura ?? 0;

  // ── Decisão de visibilidade ──────────────────────────────────────────
  const visivel = useMemo(() => {
    if (viewport.width === 0) return false; // SSR / antes de mount
    if (hideOnMobile && viewport.width < mobileBreakpoint) return false;
    if (position === 'direita' || position === 'esquerda') {
      if (!contentBounds || !slotWidth) return false;
      // espaço de cada lado do conteúdo: (viewport - contentWidth) / 2
      const espacoLateral = (viewport.width - contentBounds.width) / 2;
      return espacoLateral >= slotWidth + gap;
    }
    return true;
  }, [viewport.width, contentBounds, slotWidth, gap, hideOnMobile, mobileBreakpoint, position]);

  // ── Reserva de espaço no body (anchor top/bottom) ────────────────────
  useEffect(() => {
    if (!sticky) return;
    if (typeof document === 'undefined') return;
    if (position !== 'topo' && position !== 'rodape') return;
    if (!visivel || !slotHeight) return;

    const propName = position === 'topo' ? 'paddingTop' : 'paddingBottom';
    const valorAnterior = document.body.style[propName];
    document.body.style[propName] = `${slotHeight}px`;
    return () => {
      document.body.style[propName] = valorAnterior;
    };
  }, [sticky, position, visivel, slotHeight]);

  // ── Estilo do wrapper ────────────────────────────────────────────────
  const baseStyle: React.CSSProperties = useMemo(() => {
    if (!sticky) {
      return primario
        ? {
            width: '100%',
            maxWidth: primario.largura,
            aspectRatio: `${primario.largura} / ${primario.altura}`,
            marginLeft: 'auto',
            marginRight: 'auto',
          }
        : {};
    }

    const base: React.CSSProperties = { position: 'fixed', zIndex };

    if (position === 'topo') {
      return {
        ...base,
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
      };
    }
    if (position === 'rodape') {
      return {
        ...base,
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
      };
    }
    if (position === 'direita' || position === 'esquerda') {
      // colado ao lado do conteúdo: gap entre conteúdo e slot
      const lado = position === 'direita' ? 'right' : 'left';
      const offsetLado = contentBounds
        ? (viewport.width - contentBounds.width) / 2 - slotWidth - gap
        : gap;
      return {
        ...base,
        top: Math.max(viewport.height / 2 - slotHeight / 2, gap),
        [lado]: Math.max(offsetLado, gap),
      };
    }
    return base;
  }, [sticky, primario, position, zIndex, viewport, contentBounds, slotWidth, slotHeight, gap]);

  const slotStyle: React.CSSProperties = primario
    ? {
        width: primario.largura,
        height: primario.altura,
        maxWidth: '100%',
      }
    : {};

  // ── Render ───────────────────────────────────────────────────────────
  if (!visivel) return null;

  const conteudo = (
    <div style={baseStyle}>
      <div style={slotStyle}>
        <AdView {...req} renderEmpty={() => null} />
      </div>
    </div>
  );

  // `meio_conteudo`: portal para o container do conteúdo no índice escolhido.
  if (position === 'meio_conteudo') {
    if (typeof document === 'undefined') return null;
    const container = document.querySelector(contentSelector) as HTMLElement | null;
    if (!container) return null;
    return createPortal(conteudo, container);
  }

  // Sticky/anchor: portal para body para escapar a contextos de stacking.
  if (sticky && typeof document !== 'undefined') {
    return createPortal(conteudo, document.body);
  }

  return conteudo;
}
