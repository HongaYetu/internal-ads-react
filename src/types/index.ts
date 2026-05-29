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
  espacoId: number;
  formatoId?: number | null;
  origem?: string | null;
  sublocal?: string | null;
  userAge?: number | null;
  geoCountry?: string | null;
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
