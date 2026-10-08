import { useEffect, useState } from 'react';

/** Hora actual que se refresca cada `ms` (para obras y la mina). */
export function useNow(ms = 15_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

export function formatWait(ms: number): string {
  const m = Math.max(0, Math.ceil(ms / 60_000));
  return m >= 60 ? `${Math.floor(m / 60)} H ${m % 60} MIN` : `${m} MIN`;
}
