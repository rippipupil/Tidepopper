import { useEffect, useState } from 'react';
import { useApp } from '../data/store';
import { finishLevel, setLevelContent } from '../data/actions';
import { uid } from '../data/db';
import { levelState, PASS_PCT } from '../logic/course';
import { go } from '../router';
import { Header, Progress } from '../components/ui';
import { Missing } from './StudyView';

const SECONDS = 20;
type Phase = 'lesson' | 'quiz' | 'result';

export default function LevelView({ id, index }: { id: string; index: number }) {
  const { state, update } = useApp();
  const study = state.studies.find((s) => s.id === id);
  const course = study?.course;
  const level = course?.levels[index];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [phase, setPhase] = useState<Phase>('lesson');
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [time, setTime] = useState(SECONDS);
  const [correct, setCorrect] = useState(0);
  const [result, setResult] = useState<{ passed: boolean; stars: number; coins: number; xp: number } | null>(null);

  const load = async () => {
    if (!course || !level || level.content || busy) return;
    setBusy(true);
    setErr('');
    try {
      const { generateLevelContent } = await import('../ai/claude');
      const content = await generateLevelContent(state.settings, course, index);
      update((s) => setLevelContent(s, id, index, content));
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

  useEffect(() => {
    if (phase !== 'quiz' || picked !== null || time === 0) return;
    const t = window.setTimeout(() => setTime((x) => x - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, picked, time]);

  if (!study || !course || !level) return <Missing />;
  if (levelState(course, index) === 'locked')
    return (
      <main className="screen">
        <Header back={`#/curso/${id}`} title={`Nivel ${index + 1}`} />
        <p className="muted">Este nivel aún está bloqueado. Aprueba el anterior para abrirlo.</p>
      </main>
    );

  const content = level.content;
  if (!content)
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

  if (phase === 'lesson')
    return (
      <main className="screen" style={{ paddingBottom: 32 }}>
        <Header back={`#/curso/${id}`} title={`Nivel ${index + 1} · ${level.title}`} />
        <article className="px" style={{ padding: 20, fontSize: 16, lineHeight: 1.6 }}>
          {content.lesson.split(/\n\s*\n/).map((p, k) => (
            <p key={k} style={{ margin: k ? '12px 0 0' : 0, whiteSpace: 'pre-wrap' }}>
              {p}
            </p>
          ))}
        </article>
        <section className="lcd" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 19, color: 'var(--dim)' }}>&gt; IDEAS CLAVE</div>
          {content.keyPoints.map((k, n) => (
            <div key={n} style={{ fontFamily: 'var(--f-body)', fontSize: 15, color: 'var(--text)' }}>
              · {k}
            </div>
          ))}
        </section>
        <div className="row">
          <a className="btn ghost" href={`#/estudio/${id}/chat?q=${encodeURIComponent(`Tengo una duda sobre «${level.title}»: `)}`}>
            Preguntar
          </a>
          <button className="btn gold grow" disabled={content.quiz.length === 0} onClick={() => setPhase('quiz')}>
            Empezar práctica
          </button>
        </div>
      </main>
    );

  const total = content.quiz.length;

  if (phase === 'result' && result) {
    const pct = Math.round((100 * correct) / total);
    return (
      <main className="screen" style={{ paddingBottom: 32 }}>
        <Header back={`#/curso/${id}`} title={`Nivel ${index + 1}`} />
        <section className="lcd" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 20, color: 'var(--dim)' }}>
            {correct}/{total} ACIERTOS · {pct}%
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
        {result.passed && <p className="muted" style={{ margin: 0 }}>Las tarjetas de este nivel ya están en tu repaso: alimentan tus defensas y tus exámenes.</p>}
        <div className="row" style={{ marginTop: 'auto' }}>
          <button
            className="btn ghost grow"
            onClick={() => {
              setPhase('lesson');
              setPos(0);
              setPicked(null);
              setCorrect(0);
              setTime(SECONDS);
              setResult(null);
            }}
          >
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

  const q = content.quiz[pos];
  const answered = picked !== null || time === 0;
  const pick = (k: number) => {
    if (answered) return;
    setPicked(k);
    if (k === q.answer) setCorrect((c) => c + 1);
  };
  const next = () => {
    if (pos + 1 < total) {
      setPos(pos + 1);
      setPicked(null);
      setTime(SECONDS);
      return;
    }
    const now = Date.now();
    const r = finishLevel(state, id, index, correct, total, now, uid);
    update((s) => finishLevel(s, id, index, correct, total, now, uid).state);
    setResult({ passed: r.passed, stars: r.stars, coins: r.reward?.coins ?? 0, xp: r.reward?.xp ?? 0 });
    setPhase('result');
  };

  return (
    <main className="screen" style={{ paddingBottom: 32 }}>
      <Header back={`#/curso/${id}`} title={`Práctica · Nivel ${index + 1}`}>
        <span className="vt" style={{ fontSize: 22, color: time <= 5 && !answered ? 'var(--coral)' : 'var(--glow)' }}>
          {time}s
        </span>
      </Header>
      <Progress value={(100 * time) / SECONDS} color={time <= 5 ? 'var(--coral)' : 'var(--blue-hi)'} track="var(--lcd-hi)" height={10} />
      <section className="lcd" style={{ padding: '18px 16px' }}>
        <div style={{ fontSize: 18, color: 'var(--dim)' }}>
          PREGUNTA {pos + 1}/{total}
        </div>
        <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginTop: 6 }}>{q.prompt}</div>
      </section>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {q.options.map((o, k) => {
          const bg = !answered ? 'var(--paper)' : k === q.answer ? 'var(--mint)' : k === picked ? 'var(--coral)' : '#7f93a5';
          return (
            <button key={k} className="px" onClick={() => pick(k)} style={{ border: 0, cursor: 'pointer', textAlign: 'left', padding: '14px 16px', fontSize: 15, fontWeight: 600, background: bg }}>
              {o}
            </button>
          );
        })}
      </div>
      {answered && (
        <>
          <div className="lcd toast" role="status" style={{ fontSize: 18, color: picked === q.answer ? 'var(--mint)' : 'var(--coral)' }}>
            {picked === q.answer ? '¡BIEN! ' : time === 0 && picked === null ? '¡TIEMPO! ' : 'CASI. '}
            <span style={{ fontFamily: 'var(--f-body)', fontSize: 14, color: 'var(--text)' }}>{q.explanation}</span>
          </div>
          <button className="btn block" onClick={next}>
            {pos + 1 < total ? 'Siguiente' : 'Ver resultado'}
          </button>
        </>
      )}
    </main>
  );
}
