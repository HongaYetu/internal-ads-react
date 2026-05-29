# @hongayetu/internal-ads-react

SDK **React (web)** para consumir a API v2 de anúncios da HongaYetu. Equivalente direto do [`@hongayetu/internal-ads-react-native`](https://github.com/HongaYetu/internal-ads-react-native) mas com componentes DOM (`<img>`, `<video>`) e persistência via `localStorage`.

> ⚠️ Package interno do ecossistema HongaYetu. Versões seguem o ritmo da central.

## Instalação

```bash
npm install @hongayetu/internal-ads-react axios
```

`axios` é peerDep — quase todos os projectos Inertia/Laravel já o têm.

## ⚠️ Modelo de segurança — leitura obrigatória

| Modo | Token no bundle JS? | Quando usar |
|---|---|---|
| `direct` | **Sim** — extraível por qualquer pessoa que inspeccione | Sites internos com acesso restrito. |
| `proxy` (recomendado) | Não — só um token de sessão do utilizador | Qualquer site público (e-commerce, etc.). |

Em `proxy`, o token HongaYetu fica no servidor do consumer (via [composer pkg `hongayetu/internal-ads-proxy`](https://github.com/HongaYetu/internal-ads-proxy)) e nunca chega ao browser.

## Setup — modo `proxy` (recomendado)

Backend Laravel:
```bash
composer require hongayetu/internal-ads-proxy
```
```dotenv
HONGAYETU_ADS_ENABLED=true
HONGAYETU_ADS_BASE_URL=https://anuncios.hongayetu.com/api/v2/ads
HONGAYETU_ADS_TOKEN=<bearer-da-Filament>
```

Frontend Inertia:
```tsx
import { AdsProvider } from '@hongayetu/internal-ads-react';

export default function AppLayout({ children, auth }) {
  return (
    <AdsProvider
      config={{
        baseUrl: '/api/ads-proxy',   // mesmo domínio Laravel
        token: auth.token,            // sessão Sanctum
        mode: 'proxy',
      }}
    >
      {children}
    </AdsProvider>
  );
}
```

## Uso em páginas — `<AdSlot>`

Inserção lazy com altura reservada (evita CLS / layout shift):

```tsx
import { AdSlot } from '@hongayetu/internal-ads-react';

<AdSlot
  espacoId={1}
  origem="humbi_shop"
  sublocal="inicio"
  reservedHeight={180}
  wrapperStyle={{ margin: '16px 0', borderRadius: 8, overflow: 'hidden' }}
/>
```

## Uso avançado — `useAd`

```tsx
import { useAd } from '@hongayetu/internal-ads-react';

function CustomAd() {
  const { anuncio, loading, markImpression, markClick } = useAd({
    espacoId: 2,
    origem: 'humbi_shop',
    sublocal: 'produto_show',
  });

  if (loading) return <Skeleton />;
  if (!anuncio) return null;

  return (
    <button onClick={markClick}>
      <img src={anuncio.assets[0]?.url} alt={anuncio.nome} />
    </button>
  );
}
```

## Vídeo

HLS é suportado nativamente pelo Safari. Para Chrome/Firefox, instala `hls.js` ou usa o fallback (MP4 progressive — o servidor devolve `url` junto com `hls_url`).

```bash
# opcional para HLS em browsers não-Safari
npm install hls.js
```

(suporte HLS automático com hls.js virá em v0.2 — por agora o package usa `<video src>` simples)

## API

### `AdsConfig`

| Campo | Tipo | Descrição |
|---|---|---|
| `baseUrl` | string | URL base (`/api/ads-proxy` em mode proxy, ou completa em direct). |
| `token` | string | Bearer (sessão Sanctum em proxy; ConnectedProject em direct). |
| `mode` | `'direct' \| 'proxy'` | Default `'direct'`. |
| `deviceId` | string? | Override (default: persistido em localStorage). |
| `debug` | boolean? | Log de erros. |

### `<AdSlot />`

| Prop | Tipo | Default | Descrição |
|---|---|---|---|
| `espacoId` | number | obrigatório | ID do espaço. |
| `origem` | string? | — | Código da origem (ex: `humbi_shop`). |
| `sublocal` | string? | — | Código do sublocal. |
| `userAge` | number? | — | Idade do user (para targeting etário). |
| `geoCountry` | string? | — | Código país ISO 2 (`AO`). |
| `reservedHeight` | number | `180` | Altura do skeleton em px. |
| `lazy` | boolean | `true` | Lazy mount via IntersectionObserver. |
| `impressionDelayMs` | number | `1000`/`2000` | Override do delay. |

## Build local

```bash
npm install
npm run build   # tsup → dist/index.{cjs,mjs,d.ts}
npm run lint    # tsc --noEmit
```
