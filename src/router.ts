import { useEffect, useState } from 'react';

/** Enrutado por hash (#/estudios/…): funciona igual en GitHub Pages y dentro del APK. */
export function useRoute(): { path: string[]; query: URLSearchParams } {
  const read = () => {
    const raw = window.location.hash.replace(/^#\/?/, '');
    const [p, q = ''] = raw.split('?');
    return { path: p.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(q) };
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function go(to: string): void {
  window.location.hash = to;
}
