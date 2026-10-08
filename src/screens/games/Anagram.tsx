import { useState } from 'react';
import { useApp } from '../../data/store';
import { studyCards } from '../../data/actions';
import { anagramCards, normalize, scramble } from '../../logic/games';
import { Header, Progress } from '../../components/ui';
import { Missing } from '../StudyView';
import { Feedback, useFinish } from './common';

export function AnagramRound({ prompt, letters, expected, onDone }: { prompt: string; letters: string[]; expected: string; onDone: (ok: boolean) => void }) {
  const [used, setUsed] = useState<number[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const word = used.map((k) => letters[k]).join('');
  const full = used.length === letters.length;
  return (
    <>
      <section className="lcd" style={{ padding: '18px 16px' }}>
        <div style={{ fontSize: 18, color: 'var(--dim)' }}>ORDENA LAS LETRAS</div>
        <div style={{ fontFamily: 'var(--f-body)', fontSize: 16, color: 'var(--text)', marginTop: 6 }}>{prompt}</div>
      </section>
      <div className="px" aria-live="polite" style={{ padding: '16px 12px', minHeight: 64, textAlign: 'center', fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 26, letterSpacing: 3 }}>
        {word || ' '}
      </div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {letters.map((l, k) => (
          <button key={k} className="btn ghost" disabled={used.includes(k) || checked !== null} onClick={() => setUsed([...used, k])} style={{ width: 48, minHeight: 48, padding: 0, fontSize: 22, textTransform: 'uppercase' }}>
            {l === ' ' ? '␣' : l}
          </button>
        ))}
      </div>
      {checked === null ? (
        <div className="row">
          <button className="btn ghost" disabled={!used.length} onClick={() => setUsed(used.slice(0, -1))}>
            Borrar
          </button>
          <button className="btn grow" disabled={!full} onClick={() => setChecked(normalize(word) === normalize(expected))}>
            Comprobar
          </button>
        </div>
      ) : (
        <>
          <Feedback ok={checked} text={checked ? '¡BIEN!' : `ERA «${expected}»`} />
          <button className="btn block" onClick={() => onDone(checked)}>
            Seguir
          </button>
        </>
      )}
    </>
  );
}

export default function Anagram({ id }: { id: string }) {
  const { state } = useApp();
  const study = state.studies.find((s) => s.id === id);
  const [items] = useState(() =>
    anagramCards(studyCards(state, id))
      .sort(() => Math.random() - 0.5)
      .slice(0, 6)
      .map((c) => ({ ...c, letters: scramble(c.front.trim()) })),
  );
  const [pos, setPos] = useState(0);
  const [correct, setCorrect] = useState(0);
  const finish = useFinish(id);
  if (!study || !items.length) return <Missing />;
  const c = items[pos];
  return (
    <main className="screen" style={{ paddingBottom: 32 }}>
      <Header back={`#/estudio/${id}/juegos`} title="Ordena las letras">
        <span className="vt" style={{ fontSize: 20, color: 'var(--glow)' }}>
          {pos + 1}/{items.length}
        </span>
      </Header>
      <Progress value={(100 * pos) / items.length} color="var(--blue-hi)" track="var(--lcd-hi)" height={8} />
      <AnagramRound
        key={c.id}
        prompt={c.back}
        letters={c.letters}
        expected={c.front.trim()}
        onDone={(ok) => {
          const n = correct + (ok ? 1 : 0);
          if (pos + 1 < items.length) {
            setCorrect(n);
            setPos(pos + 1);
          } else finish(n, items.length);
        }}
      />
    </main>
  );
}
