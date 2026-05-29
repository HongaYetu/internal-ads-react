// Provider
export { AdsProvider, type AdsProviderProps } from './context/AdsProvider';

// Hooks
export { useAd, type UseAdState } from './hooks/useAd';
export { useDeviceId } from './hooks/useDeviceId';

// Components
export { AdView, type AdViewProps } from './components/AdView';
export { AdSlot, type AdSlotProps } from './components/AdSlot';

// Types
export type {
  AdAsset,
  AdAssetQuality,
  AdAssetStatus,
  Anuncio,
  AdTokens,
  AdServeRequest,
  AdServeResponse,
  AdsConfig,
  AdsMode,
} from './types';

// API (low-level)
export * as adsApi from './api/client';
