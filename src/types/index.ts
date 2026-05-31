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
  /** Duração do vídeo (apenas quando `tipo='video'`). */
  duracao_segundos?: number | null;
  /** MP4 direto (apenas vídeo). Usar como fallback quando `hls_url` indisponível. */
  mp4_url?: string | null;
  /** Textos estruturados (anúncios nativos). Populado pela IA / criação manual. */
  texto_titulo?: string | null;
  texto_descricao?: string | null;
  texto_cta?: string | null;
};

export type Anuncio = {
  id: number;
  nome: string;
  url: string | null;
  cpm: number;
  cpc: number;
  assets: AdAsset[];
  /** URL pública do logo da marca (anúncios nativos). */
  logo_url?: string | null;
  /** Nome do anunciante para exibição (ex: "Unitel"). */
  anunciante?: string | null;
};

/**
 * Dados normalizados para anúncios nativos. Derivado de `Anuncio` + 1º asset
 * via `toNativeAdData()`. O consumer renderiza estes campos dentro do card.
 */
export type NativeAdData = {
  headline: string;
  descricao: string | null;
  cta: string;
  imageUrl: string | null;
  imageLargura: number | null;
  imageAltura: number | null;
  logoUrl: string | null;
  anunciante: string | null;
  url: string | null;
};

/**
 * Helpers passados a `renderCard()` do `<AdNativeSlot>`. O consumer aplica
 * `ref` no elemento raíz do card (para tracking de impressão IAB) e usa
 * `clickHref` num `<a>`/`<Link>` ou `onPress` num botão.
 */
export type NativeAdHelpers = {
  /** URL absoluto para o proxy GET — usar como `href` no link do card. */
  clickHref?: string | null;
  /** Fallback para modo direct: chama o tracking de clique + abre destino. */
  onPress: () => void | Promise<void>;
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
  /**
   * Lista de tamanhos exactos aceites pelo slot. Quando definida, o API só
   * devolve anúncios cuja versão (ou original) corresponda EXACTAMENTE a uma
   * das entradas. Se não houver match, devolve `data: null` (no-fill).
   *
   * Quando omitido (default), aplica matching aproximado por área/aspect-ratio.
   */
  formatos?: Array<{ largura: number; altura: number }> | null;
};

/**
 * Eventos de progresso de vídeo emitidos pelo `<AdInterstitial>` ao backend.
 */
export type VideoEvent =
  | 'start'
  | 'quartil_25'
  | 'quartil_50'
  | 'quartil_75'
  | 'complete'
  | 'skip'
  | 'close';

/**
 * Política de slot — só presente em sublocais/espaços que tenham configurado
 * skip/cap/min_view (publisher decide). O `<AdInterstitial>` usa-a; o
 * `<AdSlot>` ignora.
 */
export type PoliticaInterstitial = {
  skip_after_ms: number;
  frequency_cap_dia: number;
  interstitial_min_view_ms: number;
  /**
   * Cooldown mínimo (segundos) entre duas exibições do mesmo sublocal para
   * o mesmo utilizador. Default 0 (sem cooldown). Protege contra spam quando
   * o user reabre o app várias vezes em sucessão.
   */
  intervalo_minimo_segundos: number;
  fonte: 'sublocal' | 'espaco';
};

export type AdServeResponse = {
  anuncio: Anuncio;
  tokens: AdTokens;
  ttl: number;
  politica?: PoliticaInterstitial;
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
