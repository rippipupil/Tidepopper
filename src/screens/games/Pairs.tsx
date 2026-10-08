import { useEffect, useState } from 'react';
import { useApp } from '../../data/store';
import { studyCards } from '../../data/actions';
import { buildPairs } from '../../logic/games';
import { Header } from '../../components/ui';
import { Missing } from '../StudyView';
import { useFinish } from './common';

export default function Pairs({ id }: { id: string }) {
  const { state } = useApp();
  const study = state.studies.find((s) => s.id === id);
  const [tiles] = useState(() => buildPairs(studyCards(state, id), 6));
  const [open, setOpen] = useState<string[]>([]);
  const [solved, setSolved] = useState<string[]>([]);
  const [misses, setMisses] = useState(0);
  const [secs, setSecs] = useState(0);
  const finish = useFinish(id);
  const pairs = tiles.length / 2;

  useEffect(() => {
    if (solved.length === pairs) return;
    const t = window.setInterval(() => setSecs((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, [solved.length, pairs]);

  if (!study) return <Missing />;
  if (!tiles.length)
    return (
      <main className="screen">
        <Header back={`#/estudio/${id}/juegos`} title="Parejas" />
        <p className="muted">Necesitas al menos 3 tarjetas.</p>
      </main>
    );

  const tap = (key: string) => {
    if (open.length === 2 || open.includes(key) || solved.includes(tiles.find((t) => t.key === key)!.pair)) return;
    const next = [...open, key];
    setOpen(next);
    if (next.length === 2) {
      const [a, b] = next.map((k) => tiles.find((t) => t.key === k)!);
      if (a.pair === b.pair && a.side !== b.side) {
        setSolved((s) => [...s, a.pair]);
        setOpen([]);
      } else {
        setMisses((m) => m + 1);
        window.setTimeout(() => setOpen([]), 900);
      }
    }
  };
  const done = solved.length === pairs;
  // Cada pareja cuenta como acierto; los fallos restan, sin bajar de la mitad.
  const correct = Math.max(Math.ceil(pairs / 2), pairs - Math.floor(misses / 2));

  return (
    <main className="screen" style={{ paddingBottom: 32 }}>
      <Header back={`#/estudio/${id}/juegos`} title="Parejas">
        <span className="vt" style={{ fontSize: 20, color: 'var(--glow)' }}>
          {solved.length}/{pairs} · {secs}s
        </span>
      </Header>
      <p className="muted" style={{ margin: 0 }}>
        Toca un término y luego su definición.
      </p>
      <div className="grid3" style={{ gap: 12 }}>
        {tiles.map((t) => {
          const isSolved = solved.includes(t.pair);
          const isOpen = open.includes(t.key);
          const wrong = open.length === 2 && isOpen && !isSolved;
          return (
            <button
              key={t.key}
              className="px"
              onClick={() => tap(t.key)}
              aria-pressed={isOpen}
              style={{ border: 0, cursor: 'pointer', minHeight: 92, padding: 8, fontSize: t.side === 'front' ? 14 : 12, fontWeight: t.side === 'front' ? 700 : 500, lineHeight: 1.25, background: isSolved ? 'var(--mint)' : wrong ? 'var(--coral)' : isOpen ? 'var(--blue-hi)' : t.side === 'front' ? 'var(--paper)' : '#c9d6e1', opacity: isSolved ? 0.75 : 1, overflow: 'hidden' }}
            >
              {t.text.length > 70 ? t.text.slice(0, 68) + '…' : t.text}
            </button>
          );
        })}
      </div>
      {done && (
        <button className="btn gold block" style={{ marginTop: 'auto' }} onClick={() => finish(correct, pairs)}>
          ¡Hecho! Cobrar · {misses} fallos
        </button>
      )}
    </main>
  );
}
