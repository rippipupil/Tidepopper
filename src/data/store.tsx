import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppState } from './types';
import { hydrate, initialState } from './actions';
import { loadState, saveState } from './db';

interface Ctx {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  ready: boolean;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const timer = useRef<number>();

  useEffect(() => {
    loadState()
      .then((saved) => setState(hydrate(saved)))
      .finally(() => setReady(true));
  }, []);

  // Guarda en el dispositivo poco después de cada cambio.
  useEffect(() => {
    if (!ready) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void saveState(state), 250);
  }, [state, ready]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);
  return <AppCtx.Provider value={{ state, update, ready }}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp fuera de AppProvider');
  return ctx;
}
