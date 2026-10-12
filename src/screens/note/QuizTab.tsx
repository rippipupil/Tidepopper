import { useState } from 'react';
import { Lightbulb, RotateCcw, Sparkles, Zap } from 'lucide-react';
import { useApp } from '../../data/store';
import { noteCards, recordQuiz } from '../../data/actions';
import { quizFromCards } from '../../logic/quiz';
import { encourage, praise } from '../../logic/lesson';
import type { LessonStep, Note, QuizLevel } from '../../data/types';
import { StepView } from '../../components/Steps';
import { Loading } from '../../components/ui';

const LEVELS: { id: QuizLevel; label: string; text: string }[] = [
  { id: 'basico', label: 'Básico', text: 'Lo principal' },
  { id: 'medio', label: 'Medio', text: 'Comprender y relacionar' },
  { id: 'examen', label: 'Examen', text: 'Casos y trampas' },
];

const answerText = (s: LessonStep) =>
  s.type === 'elige' || s.type === 'hueco' ? s.options[s.answer] : s.type === 'vf' ? (s.answer ? 'Verdadero' : 'Falso') : s.type === 'escribe' ? s.accepted[0] : s.type === 'ordena' ? s.options.join(' → ') : s.pairs.map((p) => `${p.a} = ${p.b}`).join(' · ');

export default function QuizTab({ note }: { note: Note }) {
  const { state, update } = useApp();
  const cards = noteCards(state, note.id);
  const [level, setLevel] = useState<QuizLevel>('medio');
  const [count, setCount] = useState(10);
  const [qs, setQs] = useState<LessonStep[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [pos, setPos] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [hint, setHint] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);

  const begin = (list: LessonStep[]) => {
    setQs(list);
    setPos(0);
    setAnswer(null);
    setHint(false);
    setResults([]);
    setFinished(false);
  };

  const make = async () => {
    setBusy(true);
    setErr('');
    try {
      const { generateQuiz } = await import('../../ai/tasks');
      const list = await generateQuiz(state.settings, note, level, count);
      if (!list.length) throw new Error('La IA no ha devuelto preguntas válidas. Prueba otra vez.');
      begin(list);
    } catch (e) {
      const { describeAiError } = await import('../../ai/tasks');
      setErr(describeAiError(e));
    } finally {
      setBusy(false);
    }
  };

  if (busy) return <Loading text={`Preparando ${count} preguntas de nivel ${LEVELS.find((l) => l.id === level)!.label.toLowerCase()}…`} />;

  if (qs && finished) {
    const correct = results.filter(Boolean).length;
    const pct = Math.round((100 * correct) / qs.length);
    const failed = qs.filter((_, k) => !results[k]);
    return (
      <div className="col fadein" style={{ gap: 16 }}>
        <section className="card pad col pop" style={{ alignItems: 'center', textAlign: 'center', gap: 6 }}>
          <div style={{ fontSize: 46 }}>{pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '💪' : '🌱'}</div>
          <div style={{ fontSize: 40, fontWeight: 700 }}>{pct}%</div>
          <div className="muted">
            {correct} de {qs.length} correctas
          </div>
        </section>
        {failed.length > 0 && (
          <section className="col" style={{ gap: 10 }}>
            <h2>Repasa tus fallos</h2>
            {failed.map((s, k) => (
              <div key={k} className="card pad col" style={{ gap: 6 }}>
                <div style={{ fontWeight: 600 }}>{s.text}</div>
                <div className="tag pill-good" style={{ alignSelf: 'flex-start' }}>✓ {answerText(s)}</div>
                {s.explanation && <div className="muted small">{s.explanation}</div>}
              </div>
            ))}
          </section>
        )}
        <div className="row">
          {failed.length > 0 && (
            <button className="btn secondary grow" onClick={() => begin(failed)}>
              <RotateCcw size={17} /> Repetir fallos
            </button>
          )}
          <button className="btn grow" onClick={() => setQs(null)}>
            Nuevo quiz
          </button>
        </div>
      </div>
    );
  }

  if (qs) {
    const q = qs[pos];
    const onAnswer = (ok: boolean) => {
      setAnswer(ok);
      setResults((r) => [...r, ok]);
    };
    const next = () => {
      setAnswer(null);
      setHint(false);
      if (pos + 1 < qs.length) setPos(pos + 1);
      else {
        const correct = [...results].filter(Boolean).length;
        update((s) => recordQuiz(s, note.id, { at: Date.now(), level, correct, total: qs.length }));
        setFinished(true);
      }
    };
    return (
      <div className="col" style={{ gap: 14 }}>
        <div className="row">
          <div className="grow bar">
            <span style={{ width: `${(100 * pos) / qs.length}%`, background: 'var(--accent)' }} />
          </div>
          <span className="muted small">
            {pos + 1}/{qs.length}
          </span>
        </div>
        <StepView key={pos} step={q} done={answer !== null} onAnswer={onAnswer} />
        {answer === null && q.example && (
          hint ? (
            <div className="alert info fadein">💡 {q.example}</div>
          ) : (
            <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setHint(true)}>
              <Lightbulb size={16} /> Pista
            </button>
          )
        )}
        {answer !== null && (
          <div className={`feedback ${answer ? 'ok' : 'ko'} fadein`} role="status">
            <div style={{ fontWeight: 700, fontSize: 18, color: answer ? 'var(--good)' : 'var(--bad)' }}>{answer ? praise(pos) : encourage(pos)}</div>
            {q.explanation && <div style={{ lineHeight: 1.5 }}>{q.explanation}</div>}
            <button className="btn block" onClick={next}>
              {pos + 1 < qs.length ? 'Continuar' : 'Ver resultado'}
            </button>
          </div>
        )}
      </div>
    );
  }

  const history = note.quizzes.slice(-5).reverse();
  return (
    <div className="col fadein" style={{ gap: 16 }}>
      <section className="card pad col" style={{ gap: 16 }}>
        <div>
          <h2>Ponte a prueba</h2>
          <p className="muted small">Preguntas variadas con pista y explicación, sacadas de tus apuntes.</p>
        </div>
        <div className="col" style={{ gap: 8 }}>
          <span className="label">Dificultad</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {LEVELS.map((l) => (
              <button key={l.id} className="chip" aria-pressed={level === l.id} onClick={() => setLevel(l.id)} style={{ flexDirection: 'column', gap: 2, padding: '10px 6px', whiteSpace: 'normal', borderRadius: 16 }}>
                <b style={{ fontSize: 14 }}>{l.label}</b>
                <span style={{ fontSize: 11 }}>{l.text}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="col" style={{ gap: 8 }}>
          <span className="label">Preguntas</span>
          <div className="row" style={{ gap: 8 }}>
            {[5, 10, 15, 20].map((n) => (
              <button key={n} className="chip" aria-pressed={count === n} onClick={() => setCount(n)} style={{ padding: '8px 16px' }}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <button className="btn block" onClick={() => void make()}>
          <Sparkles size={18} /> Crear quiz con IA
        </button>
        {cards.length >= 4 && (
          <button className="btn secondary block" onClick={() => begin(quizFromCards(cards, count))}>
            <Zap size={18} /> Quiz rápido con mis tarjetas (sin IA)
          </button>
        )}
        {err && <div className="alert bad">{err}</div>}
      </section>
      {history.length > 0 && (
        <section className="col" style={{ gap: 8 }}>
          <h3>Tus últimos quizzes</h3>
          {history.map((h, k) => {
            const pct = Math.round((100 * h.correct) / h.total);
            return (
              <div key={k} className="row soft">
                <span className="grow small">
                  {LEVELS.find((l) => l.id === h.level)?.label} · {new Date(h.at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </span>
                <span className={`tag ${pct >= 70 ? 'pill-good' : pct >= 50 ? 'pill-warn' : 'pill-bad'}`}>
                  {h.correct}/{h.total} · {pct}%
                </span>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
