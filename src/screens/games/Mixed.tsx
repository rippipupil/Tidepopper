import { useState } from 'react';
import { useApp } from '../../data/store';
import { studyCards } from '../../data/actions';
import { buildMixed, type MixRound } from '../../logic/games';
import { Header, Progress } from '../../components/ui';
import { Missing } from '../StudyView';
import { Feedback, optionStyle, useFinish } from './common';
import { WriteRound } from './Write';
import { AnagramRound } from './Anagram';

const LABEL: Record<MixRound['kind'], string> = { choice: 'TIPO TEST', truefalse: 'VERDADERO O FALSO', write: 'ESCRIBE', anagram: 'ORDENA' };

function ChoiceRound({ r, onDone }: { r: Extract<MixRound, { kind: 'choice' }>; onDone: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <>
      <section className="lcd" style={{ padding: '18px 16px' }}>
        <div style={{ fontSize: 18, color: 'var(--dim)' }}>¿QUÉ SIGNIFICA?</div>
        <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 22, color: 'var(--text)', marginTop: 6 }}>{r.prompt}</div>
      </section>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {r.options.map((o, k) => (
          <button key={k} className="px" onClick={() => picked === null && setPicked(k)} style={optionStyle(picked === null ? 'var(--paper)' : k === r.answer ? 'var(--mint)' : k === picked ? 'var(--coral)' : '#7f93a5')}>
            {o}
          </button>
        ))}
      </div>
      {picked !== null && (
        <button className="btn block" onClick={() => onDone(picked === r.answer)}>
          Seguir
        </button>
      )}
    </>
  );
}

function TFRound({ r, onDone }: { r: Extract<MixRound, { kind: 'truefalse' }>; onDone: (ok: boolean) => void }) {
  const [ans, setAns] = useState<boolean | null>(null);
  const ok = ans === r.truth;
  return (
    <>
      <section className="px" style={{ padding: 20 }}>
        <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 22 }}>{r.prompt}</div>
        <div style={{ height: 4, margin: '12px 0', background: 'repeating-linear-gradient(90deg, var(--paper-sh) 0 8px, transparent 8px 12px)' }} />
        <div style={{ fontSize: 16, lineHeight: 1.5 }}>{r.shown}</div>
      </section>
      {ans === null ? (
        <div className="grid2" style={{ gap: 16 }}>
          <button className="btn" style={{ background: 'var(--coral)', color: 'var(--outline)' }} onClick={() => setAns(false)}>
            Falso
          </button>
          <button className="btn" style={{ background: 'var(--mint)', color: 'var(--outline)' }} onClick={() => setAns(true)}>
            Verdadero
          </button>
        </div>
      ) : (
        <>
          <Feedback ok={ok} text={ok ? '¡BIEN!' : `NO: ES ${r.correct}`} />
          <button className="btn block" onClick={() => onDone(ok)}>
            Seguir
          </button>
        </>
      )}
    </>
  );
}

export default function Mixed({ id }: { id: string }) {
  const { state } = useApp();
  const study = state.studies.find((s) => s.id === id);
  const [rounds] = useState(() => buildMixed(studyCards(state, id), 10));
  const [pos, setPos] = useState(0);
  const [correct, setCorrect] = useState(0);
  const finish = useFinish(id);
  if (!study || !rounds.length) return <Missing />;
  const r = rounds[pos];
  const done = (ok: boolean) => {
    const n = correct + (ok ? 1 : 0);
    if (pos + 1 < rounds.length) {
      setCorrect(n);
      setPos(pos + 1);
    } else finish(n, rounds.length, 'mixed');
  };
  return (
    <main className="screen" style={{ paddingBottom: 32 }}>
      <Header back={`#/estudio/${id}/juegos`} title="Modo mixto">
        <span className="vt" style={{ fontSize: 20, color: 'var(--glow)' }}>
          {pos + 1}/{rounds.length}
        </span>
      </Header>
      <Progress value={(100 * pos) / rounds.length} color="var(--gold)" track="var(--lcd-hi)" height={8} />
      <div className="vt" style={{ fontSize: 18, color: 'var(--gold)' }}>
        RONDA {pos + 1} · {LABEL[r.kind]} · {correct} BIEN
      </div>
      {r.kind === 'choice' && <ChoiceRound key={pos} r={r} onDone={done} />}
      {r.kind === 'truefalse' && <TFRound key={pos} r={r} onDone={done} />}
      {r.kind === 'write' && <WriteRound key={pos} prompt={r.prompt} expected={r.expected} onDone={done} />}
      {r.kind === 'anagram' && <AnagramRound key={pos} prompt={r.prompt} letters={r.letters} expected={r.expected} onDone={done} />}
    </main>
  );
}
