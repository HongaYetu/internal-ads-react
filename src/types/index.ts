/**
 * Tipos partilhados — espelham a forma de resposta da API v2 da HongaYetu.
 * Idênticos ao package `@hongayetu/internal-ads-react-native`.
 */

export type AdAssetStatus = 'pronto' | 'processando' | 'erro';

export type AdAssetQuality = {
  resolucao: string;
  bitrate: number;
  url: string;
};

export type AdAsset = {
  id: number;
  tipo: 'imagem' | 'video' | 'texto';
  status?: AdAssetStatus | null;
  url: string | null;
  /** Largura nativa do asset escolhido (px). Permite calcular aspect-ratio. */
  largura?: number | null;
  altura?: number | null;
  /** `versao` quando o asset vem do `anuncio_asset_versoes` (resize por formato);
   *  `original` quando é fallback ao asset original. */
  fonte?: 'versao' | 'original' | null;
  /** ID + slug do formato que a API escolheu para este slot. */
  formato_id?: number | null;
  formato_slug?: string | null;
  hls_url?: string | null;
  thumbnail_url?: string | null;
  qualities?: AdAssetQuality[] | null;
};

export type Anuncio = {
  id: number;
  nome: string;
  url: string | null;
  cpm: number;
  cpc: number;
  assets: AdAsset[];
};

export type AdTokens = {
  impression: string;
  click: string;
};

export type AdServeRequest = {
  /** Slug do espaço/app (ex: `humbi_shop`). Identificador estável entre ambientes. */
  espacoSlug: string;
  formatoId?: number | null;
  /** Identificador do ecrã/local dentro do app (ex: `inicio`, `produto_show`). */
  sublocal?: string | null;
  userAge?: number | null;
  geoCountry?: string | null;
  /** Dimensões reais do slot (px). Auto-preenchidas pelo `<AdSlot>` via ResizeObserver. */
  slotWidth?: number | null;
  slotHeight?: number | null;
};

export type AdServeResponse = {
  anuncio: Anuncio;
  tokens: AdTokens;
  ttl: number;
};

export type AdsMode = 'direct' | 'proxy';

export type AdsConfig = {
  baseUrl: string;
  /** Bearer token. Optional in `proxy` mode when the proxy authenticates via same-origin session cookie (Sanctum). */
  token?: string | null;
  mode?: AdsMode;
  deviceId?: string | null;
  debug?: boolean;
};
