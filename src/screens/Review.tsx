import { useState } from 'react';
import { useApp } from '../data/store';
import { finishSession, gradeCard, studyCards } from '../data/actions';
import { sessionQueue } from '../logic/srs';
import { go } from '../router';
import type { Grade } from '../data/types';
import { Header, Progress } from '../components/ui';
import { Missing } from './StudyView';

export function rewardUrl(studyId: string, correct: number, total: number, r: { coins: number; xp: number; gems: number; stars: number }) {
  return `/recompensa?e=${studyId}&ok=${correct}&t=${total}&c=${r.coins}&x=${r.xp}&g=${r.gems}&s=${r.stars}`;
}

const GRADES: { g: Grade; label: string; bg: string }[] = [
  { g: 'again', label: 'No la sabía', bg: 'var(--coral)' },
  { g: 'hard', label: 'Dudé', bg: 'var(--gold)' },
  { g: 'good', label: 'La sabía', bg: 'var(--mint)' },
];

export default function Review({ id }: { id: string }) {
  const { state, update } = useApp();
  const study = state.studies.find((s) => s.id === id);
  const [queue] = useState(() => sessionQueue(studyCards(state, id), Date.now()));
  const [pos, setPos] = useState(0);
  const [shown, setShown] = useState(false);
  const [correct, setCorrect] = useState(0);
  if (!study) return <Missing />;

  if (queue.length === 0)
    return (
      <main className="screen">
        <Header back={`#/estudio/${id}`} title={study.name} />
        <div className="lcd" style={{ padding: 18, fontSize: 20 }}>
          &gt; NADA PENDIENTE. ¡TODO AL DÍA!
        </div>
        <a className="btn" href={`#/estudio/${id}/anadir`}>
          Añadir más apuntes
        </a>
      </main>
    );

  const card = queue[pos];
  const grade = (g: Grade) => {
    const ok = correct + (g === 'again' ? 0 : 1);
    update((s) => gradeCard(s, card.id, g, Date.now()));
    if (pos + 1 < queue.length) {
      setCorrect(ok);
      setPos(pos + 1);
      setShown(false);
      return;
    }
    // La recompensa solo depende de la racha y la cartera, no de las tarjetas,
    // así que se puede calcular ya; el estado se aplica con su propia actualización.
    const now = Date.now();
    const { reward } = finishSession(state, ok, queue.length, now);
    update((s) => finishSession(s, ok, queue.length, now).state);
    go(rewardUrl(id, ok, queue.length, reward));
  };

  return (
    <main className="screen" style={{ paddingBottom: 32 }}>
      <Header back={`#/estudio/${id}`} title={study.name}>
        <span className="vt" style={{ fontSize: 22, color: 'var(--glow)' }}>
          {pos + 1}/{queue.length}
        </span>
      </Header>
      <Progress value={(100 * pos) / queue.length} color="var(--blue-hi)" track="var(--lcd-hi)" height={8} />

      <article className="px" style={{ flex: 1, minHeight: 320, padding: '26px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 28, lineHeight: 1.15 }}>{card.front}</div>
        {shown ? (
          <>
            <div style={{ height: 4, background: 'repeating-linear-gradient(90deg, var(--paper-sh) 0 8px, transparent 8px 12px)' }} />
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.55 }}>{card.back}</p>
          </>
        ) : (
          <button className="btn" style={{ marginTop: 'auto' }} onClick={() => setShown(true)}>
            Mostrar respuesta
          </button>
        )}
      </article>

      {shown && (
        <div className="grid3" style={{ gap: 16 }}>
          {GRADES.map((x) => (
            <button key={x.g} className="btn" onClick={() => grade(x.g)} style={{ background: x.bg, color: 'var(--outline)', boxShadow: 'inset 3px 3px 0 rgba(255,255,255,.4), inset -3px -3px 0 rgba(15,24,35,.25), 0 -4px 0 var(--outline), 0 4px 0 var(--outline), -4px 0 0 var(--outline), 4px 0 0 var(--outline), 0 8px 0 rgba(5,10,18,.45)', padding: '14px 4px', fontSize: 15 }}>
              {x.label}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
