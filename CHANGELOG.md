# Changelog

Todas as alterações relevantes deste package estão documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/) e o versionamento segue [SemVer](https://semver.org/) — com a ressalva (típica de packages `internal-*`) que pode haver breaking changes em releases minor se sincronizados com a central.

## [0.1.0] — 2026-05-29

### Adicionado
- Primeira versão pública — equivalente web (React DOM) do `@hongayetu/internal-ads-react-native`.
- `AdsProvider` com configuração `baseUrl + token + mode`.
- `useAd()` hook para servir + tracking manual.
- `<AdView />` componente auto-tracking com `IntersectionObserver` para visibility (50% por 1s/2s — IAB MRC).
- `<AdSlot />` wrapper recomendado para inserção em páginas: lazy mount + altura reservada (evita CLS) + collapse-on-empty.
- Suporte a **vídeo** nativo via `<video>` (HLS via browser support — Safari nativo, outros precisam HLS.js externamente). Autoplay+muted+loop+playsinline.
- `useDeviceId()` persistido em `localStorage` (UUID v4 via `crypto.randomUUID()` quando disponível).
- Cliente HTTP via **axios** (peerDep) — consistente com stack Inertia/Laravel.
- Modo `'direct'` ou `'proxy'`.
- Tipos: `Anuncio`, `AdAsset`, `AdTokens`, `AdServeRequest`, `AdsConfig`, `AdsMode`.
