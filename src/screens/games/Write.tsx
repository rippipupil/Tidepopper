import { useState } from 'react';
import { useApp } from '../../data/store';
import { studyCards } from '../../data/actions';
import { checkWritten } from '../../logic/games';
import { Header, Progress } from '../../components/ui';
import { Missing } from '../StudyView';
import { Feedback, useFinish } from './common';

export function WriteRound({ prompt, expected, onDone }: { prompt: string; expected: string; onDone: (ok: boolean) => void }) {
  const [text, setText] = useState('');
  const [res, setRes] = useState<'exact' | 'close' | 'wrong' | null>(null);
  return (
    <>
      <section className="lcd" style={{ padding: '18px 16px' }}>
        <div style={{ fontSize: 18, color: 'var(--dim)' }}>ESCRIBE EL TÉRMINO</div>
        <div style={{ fontFamily: 'var(--f-body)', fontSize: 17, color: 'var(--text)', marginTop: 6 }}>{prompt}</div>
      </section>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (res) return onDone(res !== 'wrong');
          if (text.trim()) setRes(checkWritten(text, expected));
        }}
      >
        <label className="sr" htmlFor="w">
          Tu respuesta
        </label>
        <input id="w" className="field grow" autoComplete="off" autoCapitalize="off" value={text} onChange={(e) => setText(e.target.value)} readOnly={!!res} autoFocus />
        <button type="submit" className="btn" disabled={!text.trim()}>
          {res ? 'Seguir' : 'Comprobar'}
        </button>
      </form>
      {res && <Feedback ok={res !== 'wrong'} text={res === 'exact' ? '¡EXACTO!' : res === 'close' ? `¡CASI PERFECTO! ES «${expected}»` : `ERA «${expected}»`} />}
    </>
  );
}

export default function Write({ id }: { id: string }) {
  const { state } = useApp();
  const study = state.studies.find((s) => s.id === id);
  const [items] = useState(() =>
    studyCards(state, id)
      .slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, 8),
  );
  const [pos, setPos] = useState(0);
  const [correct, setCorrect] = useState(0);
  const finish = useFinish(id);
  if (!study) return <Missing />;
  if (!items.length) return <Missing />;
  const c = items[pos];
  return (
    <main className="screen" style={{ paddingBottom: 32 }}>
      <Header back={`#/estudio/${id}/juegos`} title="Escribe">
        <span className="vt" style={{ fontSize: 20, color: 'var(--glow)' }}>
          {pos + 1}/{items.length}
        </span>
      </Header>
      <Progress value={(100 * pos) / items.length} color="var(--blue-hi)" track="var(--lcd-hi)" height={8} />
      <WriteRound
        key={c.id}
        prompt={c.back}
        expected={c.front}
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
