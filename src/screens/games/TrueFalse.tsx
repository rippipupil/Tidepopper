import { useEffect, useState } from 'react';
import { useApp } from '../../data/store';
import { studyCards } from '../../data/actions';
import { buildTrueFalse } from '../../logic/games';
import { Header, Progress } from '../../components/ui';
import { Missing } from '../StudyView';
import { Feedback, useFinish } from './common';

const TIME = 30;

export default function TrueFalse({ id }: { id: string }) {
  const { state } = useApp();
  const study = state.studies.find((s) => s.id === id);
  const [items] = useState(() => buildTrueFalse(studyCards(state, id), 60));
  const [pos, setPos] = useState(0);
  const [time, setTime] = useState(TIME);
  const [hits, setHits] = useState(0);
  const [last, setLast] = useState<{ ok: boolean; text: string } | null>(null);
  const finish = useFinish(id);

  useEffect(() => {
    if (time === 0) return;
    const t = window.setTimeout(() => setTime((x) => x - 1), 1000);
    return () => window.clearTimeout(t);
  }, [time]);

  if (!study || !items.length) return <Missing />;
  const it = items[pos % items.length];
  const answer = (v: boolean) => {
    if (time === 0) return;
    const ok = v === it.truth;
    if (ok) setHits((h) => h + 1);
    setLast({ ok, text: ok ? '¡BIEN!' : `NO: «${it.front}» ES ${it.correct}` });
    setPos(pos + 1);
  };

  return (
    <main className="screen" style={{ paddingBottom: 32 }}>
      <Header back={`#/estudio/${id}/juegos`} title="Verdadero o falso">
        <span className="vt" style={{ fontSize: 22, color: time <= 5 ? 'var(--coral)' : 'var(--glow)' }}>
          {time}s
        </span>
      </Header>
      <Progress value={(100 * time) / TIME} color={time <= 5 ? 'var(--coral)' : 'var(--blue-hi)'} track="var(--lcd-hi)" height={10} />
      {time > 0 ? (
        <>
          <section className="px" style={{ padding: 20, minHeight: 170 }}>
            <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 22 }}>{it.front}</div>
            <div style={{ height: 4, margin: '12px 0', background: 'repeating-linear-gradient(90deg, var(--paper-sh) 0 8px, transparent 8px 12px)' }} />
            <div style={{ fontSize: 16, lineHeight: 1.5 }}>{it.shown}</div>
          </section>
          <div className="grid2" style={{ gap: 16 }}>
            <button className="btn" style={{ background: 'var(--coral)', color: 'var(--outline)', minHeight: 64 }} onClick={() => answer(false)}>
              Falso
            </button>
            <button className="btn" style={{ background: 'var(--mint)', color: 'var(--outline)', minHeight: 64 }} onClick={() => answer(true)}>
              Verdadero
            </button>
          </div>
          {last && <Feedback ok={last.ok} text={last.text} />}
        </>
      ) : (
        <>
          <div className="lcd" style={{ padding: 20, textAlign: 'center', fontSize: 24 }}>
            &gt; {hits} DE {pos} BIEN
          </div>
          <button className="btn gold block" onClick={() => finish(hits, Math.max(pos, 1))}>
            Cobrar
          </button>
        </>
      )}
    </main>
  );
}
