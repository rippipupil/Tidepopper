import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../data/store';
import { finishLevel, setLevelContent } from '../data/actions';
import { uid } from '../data/db';
import { levelState, PASS_PCT } from '../logic/course';
import { encourage, isExercise, praise, stepsOf } from '../logic/lesson';
import { StepView } from './lesson/Steps';
import { go } from '../router';
import { Header, Progress } from '../components/ui';
import { Missing } from './StudyView';

type Phase = 'play' | 'result';

export default function LevelView({ id, index }: { id: string; index: number }) {
  const { state, update } = useApp();
  const study = state.studies.find((s) => s.id === id);
  const course = study?.course;
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
  const [result, setResult] = useState<{ passed: boolean; stars: number; coins: number; xp: number; correct: number; total: number } | null>(null);

  const load = async (redo = false) => {
    if (!course || !level || (level.content && !redo) || busy) return;
    setBusy(true);
    setErr('');
    try {
      const { generateLevelContent } = await import('../ai/claude');
      const content = await generateLevelContent(state.settings, course, index);
      update((s) => setLevelContent(s, id, index, content));
      if (redo) setQueue(null);
    } catch (e) {
      const { describeAiError } = await import('../ai/claude');
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

  const steps = useMemo(() => (level?.content ? stepsOf(level.content) : []), [level?.content]);
  useEffect(() => {
    if (steps.length && !queue) setQueue(steps.map((_, k) => k));
  }, [steps, queue]);

  if (!study || !course || !level) return <Missing />;
  if (levelState(course, index) === 'locked')
    return (
      <main className="screen">
        <Header back={`#/curso/${id}`} title={`Nivel ${index + 1}`} />
        <p className="muted">Este nivel aún está bloqueado. Aprueba el anterior para abrirlo.</p>
      </main>
    );

  const content = level.content;
  if (!content || !queue)
    return (
      <main className="screen">
        <Header back={`#/curso/${id}`} title={`Nivel ${index + 1}`} />
        <div className="lcd" role="status" style={{ padding: 18, fontSize: 21, color: err ? 'var(--coral)' : undefined }}>
          {err ? err : `> PREPARANDO LA LECCIÓN «${level.title.toUpperCase()}»…`}
        </div>
        {err && (
          <button className="btn" onClick={() => void load()}>
            Reintentar
          </button>
        )}
      </main>
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
      <main className="screen" style={{ paddingBottom: 32 }}>
        <Header back={`#/curso/${id}`} title={`Nivel ${index + 1}`} />
        <section className="lcd pop" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 20, color: 'var(--dim)' }}>
            {result.correct}/{result.total} A LA PRIMERA · {pct}%
          </div>
          <div style={{ fontSize: 48, color: 'var(--gold)', letterSpacing: 6 }}>{'★'.repeat(result.stars) + '☆'.repeat(3 - result.stars)}</div>
          <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 22, color: 'var(--text)' }}>{result.passed ? '¡Nivel superado!' : `Necesitas un ${PASS_PCT}% para pasar`}</div>
          <div className="row" style={{ justifyContent: 'center', gap: 18, marginTop: 10, fontSize: 22 }}>
            <span className="row" style={{ gap: 6 }}>
              <img src="img/sprites/s-moneda.svg" alt="Monedas" width={24} height={24} />+{result.coins}
            </span>
            <span className="row" style={{ gap: 6 }}>
              <img src="img/sprites/s-xp.svg" alt="Experiencia" width={24} height={24} />+{result.xp}
            </span>
          </div>
        </section>
        {content.keyPoints.length > 0 && (
          <section className="px" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2>Lo que has aprendido</h2>
            {content.keyPoints.map((k, n) => (
              <div key={n} style={{ fontSize: 15, lineHeight: 1.4 }}>
                ✓ {k}
              </div>
            ))}
          </section>
        )}
        {result.passed && <p className="muted" style={{ margin: 0 }}>Las tarjetas de este nivel ya están en tu repaso: alimentan tus defensas y tus exámenes.</p>}
        <div className="row" style={{ marginTop: 'auto' }}>
          <button className="btn ghost grow" onClick={restart}>
            Repetir nivel
          </button>
          {result.passed && index + 1 < course.levels.length ? (
            <button className="btn gold grow" onClick={() => go(`/curso/${id}/nivel/${index + 1}`)}>
              Siguiente nivel
            </button>
          ) : (
            <a className="btn grow" href={`#/curso/${id}`}>
              Ver curso
            </a>
          )}
        </div>
      </main>
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
    setResult({ passed: r.passed, stars: r.stars, coins: r.reward?.coins ?? 0, xp: r.reward?.xp ?? 0, correct, total });
    setPhase('result');
  };

  const explain = step.type === 'explica';
  return (
    <main className="screen" style={{ paddingBottom: 32 }}>
      <Header back={`#/curso/${id}`} title={`Nivel ${index + 1} · ${level.title}`}>
        {combo >= 2 && (
          <span className="vt pop" key={combo} style={{ fontSize: 22, color: 'var(--gold)' }} aria-label={`Racha de ${combo}`}>
            🔥x{combo}
          </span>
        )}
      </Header>
      <Progress value={(100 * pos) / queue.length} color="var(--mint)" track="var(--lcd-hi)" height={10} />
      {retry && <div style={{ fontFamily: 'var(--f-pixel)', fontSize: 19, color: 'var(--gold)' }}>&gt; REPASO DE FALLOS</div>}
      {!content.steps && pos === 0 && (
        <button className="btn ghost block" disabled={busy} onClick={() => void load(true)}>
          {busy ? 'Rehaciendo la lección…' : '✨ Rehacer como lección interactiva'}
        </button>
      )}
      {err && (
        <div className="lcd toast" role="alert" style={{ fontSize: 17, color: 'var(--coral)' }}>
          {err}
        </div>
      )}

      <StepView key={pos} step={step} done={answer !== null} onAnswer={onAnswer} />

      {explain && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
          <button className="btn gold block" onClick={next}>
            {pos === 0 ? '¡Vamos!' : '¡Entendido!'}
          </button>
          <a className="btn ghost block" href={`#/estudio/${id}/chat?q=${encodeURIComponent(`Explícamelo de otra forma: ${step.text}`)}`}>
            Explícamelo de otra forma
          </a>
        </div>
      )}
      {!explain && answer !== null && (
        <div className={`lcd toast ${answer ? 'pop' : 'shake'}`} role="status" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
          <div style={{ fontSize: 22, color: answer ? 'var(--mint)' : 'var(--coral)' }}>{answer ? praise(hits) : encourage(pos)}</div>
          {step.explanation && <div style={{ fontFamily: 'var(--f-body)', fontSize: 15, color: 'var(--text)', lineHeight: 1.45 }}>{step.explanation}</div>}
          {!answer && !retry && <div style={{ fontFamily: 'var(--f-body)', fontSize: 13, color: 'var(--dim)' }}>La repetirás al final.</div>}
          <button className={answer ? 'btn gold block' : 'btn block'} onClick={next}>
            Continuar
          </button>
        </div>
      )}
    </main>
  );
}
