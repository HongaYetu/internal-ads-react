import type { Anuncio, NativeAdData } from '../types';

/**
 * Normaliza o payload do `Anuncio` em `NativeAdData` para uso em cards nativos.
 * Devolve `null` quando não há nenhum asset utilizável (o `<AdNativeSlot>`
 * trata isto como no-fill e não renderiza nada).
 *
 * Regras de fallback:
 * - `headline`: `asset.texto_titulo` > `anuncio.nome`
 * - `cta`: `asset.texto_cta` > `"Saber mais"`
 * - `descricao`/`imageUrl`/`logoUrl`/`anunciante`/`url`: pass-through (nullable)
 */
export function toNativeAdData(anuncio: Anuncio): NativeAdData | null {
  const asset = anuncio.assets?.[0];
  if (!asset) return null;

  const headline = (asset.texto_titulo ?? '').trim() || anuncio.nome;
  const cta = (asset.texto_cta ?? '').trim() || 'Saber mais';

  return {
    headline,
    descricao: asset.texto_descricao ?? null,
    cta,
    imageUrl: asset.url,
    imageLargura: asset.largura ?? null,
    imageAltura: asset.altura ?? null,
    logoUrl: anuncio.logo_url ?? null,
    anunciante: anuncio.anunciante ?? null,
    url: anuncio.url ?? null,
  };
}
