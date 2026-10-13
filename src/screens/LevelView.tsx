import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../data/store';
import { finishLevel, setLevelContent } from '../data/actions';
import { uid } from '../data/db';
import { levelState, PASS_PCT } from '../logic/course';
import { encourage, isExercise, praise, shuffleChoices, stepsOf } from '../logic/lesson';
import { StepView } from '../components/Steps';
import { go } from '../router';
import { Loading, TopBar } from '../components/ui';

type Phase = 'play' | 'result';

export default function LevelView({ id, index }: { id: string; index: number }) {
  const { state, update } = useApp();
  const note = state.notes.find((n) => n.id === id);
  const course = note?.course;
  const level = course?.levels[index];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [phase, setPhase] = useState<Phase>('play');
  // Cola de pasos: los ejercicios fallados vuelven al final una vez.
  const [queue, setQueue] = useState<number[] | null>(null);
  const [pos, setPos] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [first, setFirst] = useState<Record<number, boolean>>({});
  const [combo, setCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [result, setResult] = useState<{ passed: boolean; stars: number; correct: number; total: number } | null>(null);

  const load = async (redo = false) => {
    if (!course || !level || (level.content && !redo) || busy) return;
    setBusy(true);
    setErr('');
    try {
      const { generateLevelContent } = await import('../ai/tasks');
      const content = await generateLevelContent(state.settings, course, index);
      update((s) => setLevelContent(s, id, index, content));
      if (redo) setQueue(null);
    } catch (e) {
      const { describeAiError } = await import('../ai/tasks');
      setErr(describeAiError(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
    // Solo al entrar en el nivel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, index]);

  const steps = useMemo(() => (level?.content ? shuffleChoices(stepsOf(level.content)) : []), [level?.content]);
  useEffect(() => {
    if (steps.length && !queue) setQueue(steps.map((_, k) => k));
  }, [steps, queue]);

  const back = `#/nota/${id}?tab=lecciones`;
  if (!note || !course || !level)
    return (
      <div className="app">
        <TopBar back="#/" />
        <main className="page">
          <p className="muted">Este nivel no existe.</p>
        </main>
      </div>
    );
  if (levelState(course, index) === 'locked')
    return (
      <div className="app">
        <TopBar back={back} title={`Nivel ${index + 1}`} />
        <main className="page">
          <p className="muted">Este nivel aún está bloqueado. Aprueba el anterior para abrirlo.</p>
        </main>
      </div>
    );

  const content = level.content;
  if (!content || !queue)
    return (
      <div className="app">
        <TopBar back={back} title={`Nivel ${index + 1}`} />
        <main className="page">
          {err ? <div className="alert bad">{err}</div> : <Loading text={`Preparando la lección «${level.title}»…`} />}
          {err && (
            <button className="btn" onClick={() => void load()}>
              Reintentar
            </button>
          )}
        </main>
      </div>
    );

  const exercises = steps.map((st, k) => (isExercise(st) ? k : -1)).filter((k) => k >= 0);

  const restart = () => {
    setPhase('play');
    setQueue(steps.map((_, k) => k));
    setPos(0);
    setAnswer(null);
    setFirst({});
    setCombo(0);
    setHits(0);
    setResult(null);
  };

  if (phase === 'result' && result) {
    const pct = Math.round((100 * result.correct) / result.total);
    return (
      <div className="app">
        <TopBar back={back} title={`Nivel ${index + 1}`} />
        <main className="page">
          <section className="card pad col pop" style={{ alignItems: 'center', textAlign: 'center', gap: 6 }}>
            <div style={{ fontSize: 44, color: 'var(--warn)', letterSpacing: 6 }}>{'★'.repeat(result.stars) + '☆'.repeat(3 - result.stars)}</div>
            <h1>{result.passed ? '¡Nivel superado!' : `Necesitas un ${PASS_PCT}% para pasar`}</h1>
            <div className="muted">
              {result.correct}/{result.total} a la primera · {pct}%
            </div>
          </section>
          {content.keyPoints.length > 0 && (
            <section className="card pad col" style={{ gap: 8 }}>
              <h2>Lo que has aprendido</h2>
              {content.keyPoints.map((k, n) => (
                <div key={n} style={{ fontSize: 15, lineHeight: 1.45 }}>
                  ✓ {k}
                </div>
              ))}
            </section>
          )}
          {result.passed && <p className="muted small">Las tarjetas de este nivel ya están en la pestaña Tarjetas y en tu repaso diario.</p>}
          <div className="row">
            <button className="btn secondary grow" onClick={restart}>
              Repetir nivel
            </button>
            {result.passed && index + 1 < course.levels.length ? (
              <button className="btn grow" onClick={() => go(`/nota/${id}/nivel/${index + 1}`)}>
                Siguiente nivel
              </button>
            ) : (
              <a className="btn grow" href={back}>
                Ver curso
              </a>
            )}
          </div>
        </main>
      </div>
    );
  }

  const k = queue[pos];
  const step = steps[k];
  const retry = pos >= steps.length;

  const onAnswer = (ok: boolean) => {
    setAnswer(ok);
    if (!(k in first)) {
      setFirst((f) => ({ ...f, [k]: ok }));
      // Lo fallado vuelve al final para practicarlo otra vez.
      if (!ok) setQueue((q) => [...q!, k]);
    }
    setCombo((c) => (ok ? c + 1 : 0));
    if (ok) setHits((h) => h + 1);
  };

  const next = () => {
    setAnswer(null);
    if (pos + 1 < queue.length) {
      setPos(pos + 1);
      return;
    }
    const total = Math.max(1, exercises.length);
    const correct = exercises.length ? exercises.filter((x) => first[x]).length : 1;
    const now = Date.now();
    const r = finishLevel(state, id, index, correct, total, now, uid);
    update((s) => finishLevel(s, id, index, correct, total, now, uid).state);
    setResult({ passed: r.passed, stars: r.stars, correct, total });
    setPhase('result');
  };

  const explain = step.type === 'explica';
  return (
    <div className="app">
      <TopBar back={back} title={`Nivel ${index + 1} · ${level.title}`}>
        {combo >= 2 && (
          <span className="tag pill-warn pop" key={combo} aria-label={`Racha de ${combo}`}>
            🔥 x{combo}
          </span>
        )}
      </TopBar>
      <main className="page" style={{ gap: 16 }}>
        <div className="bar">
          <span style={{ width: `${(100 * pos) / queue.length}%`, background: 'var(--good)' }} />
        </div>
        {retry && <div className="tag pill-warn" style={{ alignSelf: 'flex-start' }}>Repaso de fallos</div>}
        {!content.steps && pos === 0 && (
          <button className="btn secondary block" disabled={busy} onClick={() => void load(true)}>
            {busy ? 'Rehaciendo la lección…' : '✨ Rehacer como lección interactiva'}
          </button>
        )}
        {err && <div className="alert bad">{err}</div>}

        <StepView key={pos} step={step} done={answer !== null} onAnswer={onAnswer} />

        {explain && (
          <div className="col" style={{ gap: 10 }}>
            <button className="btn block" onClick={next}>
              {pos === 0 ? '¡Vamos!' : '¡Entendido!'}
            </button>
            <a className="btn ghost block" href={`#/nota/${id}?tab=chat&q=${encodeURIComponent(`Explícamelo de otra forma: ${step.text}`)}`}>
              Explícamelo de otra forma
            </a>
          </div>
        )}
        {!explain && answer !== null && (
          <div className={`feedback ${answer ? 'ok pop' : 'ko'}`} role="status">
            <div style={{ fontWeight: 700, fontSize: 18, color: answer ? 'var(--good)' : 'var(--bad)' }}>{answer ? praise(hits) : encourage(pos)}</div>
            {step.explanation && <div style={{ lineHeight: 1.5 }}>{step.explanation}</div>}
            {!answer && !retry && <div className="muted small">La repetirás al final.</div>}
            <button className="btn block" onClick={next}>
              Continuar
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
