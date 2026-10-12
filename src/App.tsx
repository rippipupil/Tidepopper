import { useEffect } from 'react';
import { useApp } from './data/store';
import { useRoute } from './router';
import Home from './screens/Home';
import Record from './screens/Record';
import Topic from './screens/Topic';
import Review from './screens/Review';
import Settings from './screens/Settings';
import NoteScreen from './screens/note/NoteScreen';
import LevelView from './screens/LevelView';
import ManualAi from './components/ManualAi';
import { Loading, ToastHost } from './components/ui';
import type { Theme } from './data/types';

/** Aplica el tema (claro, oscuro o el del sistema). */
function useTheme(theme: Theme) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      const t = theme === 'system' ? (mq.matches ? 'light' : 'dark') : theme;
      document.documentElement.dataset.theme = t;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#f4f7fb' : '#0e131d');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

export default function App() {
  const { state, ready } = useApp();
  useTheme(state.settings.theme);
  return (
    <>
      {ready ? <Screen /> : <Loading text="Cargando…" />}
      <ManualAi />
      <ToastHost />
    </>
  );
}

function Screen() {
  const { path, query } = useRoute();
  const [a, id, sub, n] = path;
  if (a === 'nota' && id) {
    if (sub === 'nivel') return <LevelView key={`${id}-${n}`} id={id} index={Number(n)} />;
    return <NoteScreen key={id} id={id} tab={query.get('tab') ?? undefined} />;
  }
  if (a === 'grabar') return <Record />;
  if (a === 'tema') return <Topic />;
  if (a === 'repasar') return <Review />;
  if (a === 'ajustes') return <Settings />;
  return <Home />;
}
