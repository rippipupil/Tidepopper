import { useEffect, useState } from 'react';
import { useApp } from '../data/store';
import { finishExam, studyCards, studyExams } from '../data/actions';
import { uid } from '../data/db';
import { buildQuickExam, examScore, formatScore, gradeLabel, gradeObjective, type ExamAnswer, type ExamQuestion } from '../logic/exam';
import { Header, Progress } from '../components/ui';
import { Missing } from './StudyView';

type Review = { ok: number; note?: string };
type Phase =
  | { kind: 'intro' }
  | { kind: 'loading'; text: string }
  | { kind: 'run'; type: 'rapido' | 'ia'; qs: ExamQuestion[]; pos: number; answers: ExamAnswer[]; started: number }
  | { kind: 'result'; qs: ExamQuestion[]; answers: ExamAnswer[]; review: Review[]; score: number; coins: number; xp: number; gems: number; seconds: number };

function mmss(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function Exam({ id }: { id: string }) {
  const { state, update } = useApp();
  const study = state.studies.find((s) => s.id === id);
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (phase.kind !== 'run') return;
    const t = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, [phase.kind]);

  if (!study) return <Missing />;
  const cards = studyCards(state, id);
  const history = studyExams(state, id);

  const startQuick = () => {
    const qs = buildQuickExam(cards, 10);
    if (qs.length) setPhase({ kind: 'run', type: 'rapido', qs, pos: 0, answers: qs.map(() => null), started: Date.now() });
  };

  const startAi = async () => {
    if (!state.settings.apiKey) {
      setErr('Pon tu clave de Claude en Perfil para el examen con IA. El examen rápido funciona sin ella.');
      return;
    }
    setErr('');
    setPhase({ kind: 'loading', text: 'Preparando tu examen…' });
    try {
      const { generateExam } = await import('../ai/claude');
      const raw = await generateExam(state.settings.apiKey, study.name, study.summary ?? '', cards);
      const qs: ExamQuestion[] = raw.map((q) => (q.type === 'open' ? { kind: 'open', prompt: q.prompt, reference: q.reference } : { kind: 'choice', prompt: q.prompt, options: q.options, answer: q.answer, explanation: q.explanation }));
      setPhase({ kind: 'run', type: 'ia', qs, pos: 0, answers: qs.map(() => null), started: Date.now() });
    } catch (e) {
      const { describeAiError } = await import('../ai/claude');
      setErr(describeAiError(e));
      setPhase({ kind: 'intro' });
    }
  };

  const submit = async (p: Extract<Phase, { kind: 'run' }>) => {
    const review: Review[] = p.qs.map((q, k) => ({ ok: gradeObjective(q, p.answers[k]) }));
    const open = p.qs.map((q, k) => ({ q, k })).filter((x) => x.q.kind === 'open');
    if (open.length) {
      setPhase({ kind: 'loading', text: 'Corrigiendo tus respuestas…' });
      try {
        const { gradeOpenAnswers } = await import('../ai/claude');
        const grades = await gradeOpenAnswers(
          state.settings.apiKey,
          open.map(({ q, k }) => ({ prompt: q.prompt, reference: q.kind === 'open' ? q.reference : '', answer: String(p.answers[k] ?? '') })),
        );
        open.forEach(({ k }, n) => (review[k] = { ok: grades[n].score / 10, note: `${grades[n].score}/10 · ${grades[n].feedback}` }));
      } catch (e) {
        const { describeAiError } = await import('../ai/claude');
        setErr(`${describeAiError(e)} Las preguntas de desarrollo cuentan como 0.`);
      }
    }
    const score = examScore(review.map((r) => r.ok));
    const correct = review.filter((r) => r.ok >= 0.5).length;
    const now = Date.now();
    const record = { id: uid(), studyId: id, at: now, kind: p.type, score, correct, total: p.qs.length };
    const { reward } = finishExam(state, record, now);
    update((s) => finishExam(s, record, now).state);
    setPhase({ kind: 'result', qs: p.qs, answers: p.answers, review, score, coins: reward.coins, xp: reward.xp, gems: reward.gems, seconds: Math.round((now - p.started) / 1000) });
  };

  if (phase.kind === 'loading')
    return (
      <main className="screen">
        <Header back={`#/estudio/${id}`} title="Examen" />
        <div className="lcd" style={{ padding: 18, fontSize: 22 }} role="status">
          &gt; {phase.text.toUpperCase()}
        </div>
      </main>
    );

  if (phase.kind === 'run') {
    const q = phase.qs[phase.pos];
    const a = phase.answers[phase.pos];
    const set = (v: ExamAnswer) => setPhase({ ...phase, answers: phase.answers.map((x, k) => (k === phase.pos ? v : x)) });
    const last = phase.pos + 1 === phase.qs.length;
    const blank = phase.answers.filter((x) => x === null || x === '').length;
    const pick = (selected: boolean, label: string, onClick: () => void, key: string | number) => (
      <button key={key} className="px" aria-pressed={selected} onClick={onClick} style={{ border: 0, cursor: 'pointer', textAlign: 'left', padding: '14px 16px', fontSize: 15, fontWeight: 600, background: selected ? 'var(--blue-hi)' : 'var(--paper)' }}>
        {label}
      </button>
    );
    void tick;
    return (
      <main className="screen" style={{ paddingBottom: 32 }}>
        <Header back={`#/estudio/${id}`} title={`Examen · ${study.name}`}>
          <span className="vt" style={{ fontSize: 22, color: 'var(--glow)' }}>
            {mmss(Math.round((Date.now() - phase.started) / 1000))}
          </span>
        </Header>
        <Progress value={(100 * (phase.pos + 1)) / phase.qs.length} color="var(--blue-hi)" track="var(--lcd-hi)" height={8} />
        <section className="lcd" style={{ padding: '18px 16px' }}>
          <div style={{ fontSize: 18, color: 'var(--dim)' }}>
            PREGUNTA {phase.pos + 1}/{phase.qs.length} · {q.kind === 'open' ? 'DESARROLLO' : q.kind === 'truefalse' ? 'VERDADERO O FALSO' : 'TIPO TEST'}
          </div>
          <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginTop: 6 }}>{q.prompt}</div>
          {q.kind === 'truefalse' && <div style={{ fontFamily: 'var(--f-body)', fontSize: 16, color: 'var(--text)', marginTop: 8 }}>«{q.statement}»</div>}
        </section>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {q.kind === 'choice' && q.options.map((o, k) => pick(a === k, o, () => set(k), k))}
          {q.kind === 'truefalse' && (
            <div className="grid2" style={{ gap: 16 }}>
              {pick(a === true, 'Verdadero', () => set(true), 'v')}
              {pick(a === false, 'Falso', () => set(false), 'f')}
            </div>
          )}
          {q.kind === 'open' && (
            <>
              <label className="sr" htmlFor="open">
                Tu respuesta
              </label>
              <textarea id="open" className="field" style={{ minHeight: 180 }} value={typeof a === 'string' ? a : ''} onChange={(e) => set(e.target.value)} placeholder="Escribe tu respuesta…" />
            </>
          )}
        </div>
        <div className="row" style={{ marginTop: 'auto' }}>
          <button className="btn ghost" disabled={phase.pos === 0} onClick={() => setPhase({ ...phase, pos: phase.pos - 1 })}>
            Anterior
          </button>
          {last ? (
            <button
              className="btn gold grow"
              onClick={() => {
                if (blank > 0 && !confirm(`Tienes ${blank} sin responder. ¿Entregar igualmente?`)) return;
                void submit(phase);
              }}
            >
              Entregar examen
            </button>
          ) : (
            <button className="btn grow" onClick={() => setPhase({ ...phase, pos: phase.pos + 1 })}>
              Siguiente
            </button>
          )}
        </div>
      </main>
    );
  }

  if (phase.kind === 'result') {
    const passed = phase.score >= 5;
    const answerText = (q: ExamQuestion, a: ExamAnswer) =>
      a === null || a === '' ? 'En blanco' : q.kind === 'choice' ? q.options[a as number] : q.kind === 'truefalse' ? (a ? 'Verdadero' : 'Falso') : String(a);
    const rightText = (q: ExamQuestion) => (q.kind === 'choice' ? q.options[q.answer] : q.kind === 'truefalse' ? (q.answer ? 'Verdadero' : 'Falso') : q.reference);
    return (
      <main className="screen" style={{ paddingBottom: 32 }}>
        <Header back={`#/estudio/${id}`} title="Resultado" />
        <section className="lcd" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 20, color: 'var(--dim)' }}>
            {study.name.toUpperCase()} · {mmss(phase.seconds)}
          </div>
          <div style={{ fontSize: 84, lineHeight: 1, color: passed ? 'var(--gold)' : 'var(--coral)' }}>{formatScore(phase.score)}</div>
          <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 22, color: 'var(--text)' }}>{gradeLabel(phase.score)}</div>
          <div className="row" style={{ justifyContent: 'center', gap: 18, marginTop: 12, fontSize: 22 }}>
            <span className="row" style={{ gap: 6 }}>
              <img src="img/sprites/s-moneda.svg" alt="Monedas" width={24} height={24} />+{phase.coins}
            </span>
            <span className="row" style={{ gap: 6 }}>
              <img src="img/sprites/s-xp.svg" alt="Experiencia" width={24} height={24} />+{phase.xp}
            </span>
            {phase.gems > 0 && (
              <span className="row" style={{ gap: 6 }}>
                <img src="img/sprites/s-cristal.svg" alt="Cristales" width={24} height={24} />+{phase.gems}
              </span>
            )}
          </div>
        </section>
        {err && (
          <div className="lcd toast" style={{ color: 'var(--coral)', fontSize: 18 }}>
            {err}
          </div>
        )}
        <h2>Corrección</h2>
        {phase.qs.map((q, k) => {
          const r = phase.review[k];
          const ok = r.ok >= 0.5;
          return (
            <article key={k} className="px" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, lineHeight: 1.45 }}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <span className="vt" style={{ color: ok ? '#4f8a76' : '#a8695a', fontSize: 18, flex: 'none' }}>
                  {k + 1}. {q.kind === 'open' ? `${Math.round(r.ok * 10)}/10` : ok ? 'BIEN' : 'MAL'}
                </span>
                <strong>{q.kind === 'truefalse' ? `${q.prompt}: «${q.statement}»` : q.prompt}</strong>
              </div>
              <div>Tu respuesta: {answerText(q, phase.answers[k])}</div>
              {(!ok || q.kind === 'open') && <div style={{ color: 'var(--blue-sh)' }}>{q.kind === 'open' ? `Modelo: ${rightText(q)}` : `Correcta: ${rightText(q)}`}</div>}
              {r.note && <div style={{ color: 'var(--ink-soft)' }}>{r.note}</div>}
              {q.kind !== 'open' && q.explanation && !ok && <div style={{ color: 'var(--ink-soft)' }}>{q.explanation}</div>}
            </article>
          );
        })}
        <div className="row">
          <a className="btn ghost grow" href={`#/estudio/${id}`}>
            Volver
          </a>
          <button className="btn grow" onClick={() => setPhase({ kind: 'intro' })}>
            Otro examen
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="screen">
      <Header back={`#/estudio/${id}`} title={`Examen · ${study.name}`} />
      <p className="muted" style={{ margin: 0 }}>
        Como un examen de verdad: no ves si aciertas hasta entregar. Aprobar paga mucho más que una sesión normal.
      </p>
      <button className="px" disabled={cards.length < 4} onClick={startQuick} style={{ border: 0, cursor: cards.length < 4 ? 'default' : 'pointer', textAlign: 'left', padding: 18, opacity: cards.length < 4 ? 0.5 : 1, display: 'flex', gap: 14, alignItems: 'center' }}>
        <img src="img/icons/i-cards.svg" alt="" width={48} height={48} />
        <span>
          <span style={{ display: 'block', fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 18 }}>Examen rápido</span>
          <span style={{ fontSize: 14, color: 'var(--ink-soft)' }}>10 preguntas de tus tarjetas: tipo test y verdadero o falso. Sin IA.</span>
        </span>
      </button>
      <button className="px" disabled={cards.length === 0} onClick={() => void startAi()} style={{ border: 0, cursor: cards.length ? 'pointer' : 'default', textAlign: 'left', padding: 18, opacity: cards.length ? 1 : 0.5, display: 'flex', gap: 14, alignItems: 'center' }}>
        <img src="img/icons/i-ai.svg" alt="" width={48} height={48} />
        <span>
          <span style={{ display: 'block', fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 18 }}>Examen completo con IA</span>
          <span style={{ fontSize: 14, color: 'var(--ink-soft)' }}>Preguntas nuevas tipo test y de desarrollo sobre tus apuntes. La IA corrige y explica.</span>
        </span>
      </button>
      {cards.length < 4 && <p className="muted" style={{ margin: 0 }}>El examen rápido necesita al menos 4 tarjetas.</p>}
      {err && (
        <div className="lcd toast" role="status" style={{ color: 'var(--coral)', fontSize: 18 }}>
          {err}
        </div>
      )}
      {history.length > 0 && (
        <section className="lcd" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 19 }}>
          <div style={{ color: 'var(--dim)' }}>&gt; TUS NOTAS</div>
          {history.slice(0, 6).map((e) => (
            <div key={e.id} className="row">
              <span className="grow">
                {new Date(e.at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).toUpperCase()} · {e.kind === 'ia' ? 'CON IA' : 'RÁPIDO'}
              </span>
              <span style={{ color: e.score >= 5 ? 'var(--gold)' : 'var(--coral)', fontSize: 22 }}>{formatScore(e.score)}</span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
