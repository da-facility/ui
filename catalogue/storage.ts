import {useEffect, useState} from 'react';

/** State remembered across reloads. Storage is optional, so failures are ignored. */
export function useStoredState<T>(key: string, initial: T) {
  const storageKey = `da-ui-catalogue:${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored === null ? initial : JSON.parse(stored) as T;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch { /* Private windows and blocked storage. */ }
  }, [storageKey, value]);
  return [value, setValue] as const;
}
