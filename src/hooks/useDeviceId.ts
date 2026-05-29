import { useEffect, useState } from 'react';

const STORAGE_KEY = '@hongayetu/internal-ads/device_id';

function uuidv4(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto & { randomUUID(): string }).randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Devolve um `device_id` estável por browser, persistido em `localStorage`.
 * Em SSR/Node (window undefined), devolve null até a hidratação client-side.
 * Permite override (útil para testes).
 */
export function useDeviceId(override?: string | null): string | null {
  const [id, setId] = useState<string | null>(override ?? null);

  useEffect(() => {
    if (override) {
      setId(override);
      return;
    }
    if (typeof window === 'undefined' || !window.localStorage) {
      setId((prev) => prev ?? uuidv4());
      return;
    }
    try {
      let stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        stored = uuidv4();
        window.localStorage.setItem(STORAGE_KEY, stored);
      }
      setId(stored);
    } catch {
      setId(uuidv4());
    }
  }, [override]);

  return id;
}
