import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';

const STORAGE_KEY = 'df-ui-library-extra-navigation';
const TweaksContext = createContext({extraItems: [] as string[], enabled: false, setEnabled: (_enabled: boolean) => {}});

export function LibraryTweaksProvider({children}: {children: ReactNode}) {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });
  const [items] = useState(() => {
    const adjectives = ['North', 'Shared', 'Daily', 'Regional', 'Internal', 'Weekly', 'Global', 'Central'];
    const nouns = ['Reports', 'Projects', 'Teams', 'Resources', 'Requests', 'Activity', 'Schedules', 'Archives'];
    return Array.from({length: 100}, (_, index) => `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]} ${String(index + 1).padStart(3, '0')}`);
  });
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(enabled)); } catch { /* Optional persistence. */ }
  }, [enabled]);
  return <TweaksContext value={{enabled, setEnabled, extraItems: enabled ? items : []}}>{children}</TweaksContext>;
}

export const useLibraryTweaks = () => useContext(TweaksContext);
