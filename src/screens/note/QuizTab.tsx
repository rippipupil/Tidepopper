import { useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb, RotateCcw, SendHorizontal, Sparkles, Target, Zap } from 'lucide-react';
import { useApp } from '../../data/store';
import { noteCards, recordQuiz } from '../../data/actions';
import { quizFromCards } from '../../logic/quiz';
import { encourage, praise } from '../../logic/lesson';
import { cleanTitle, parseQuizRequest, splitSections, type QuizRequest } from '../../logic/sections';
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

const TYPE_LABEL: Record<string, string> = { elige: 'Tipo test', vf: 'Verdadero o falso', hueco: 'Huecos', escribe: 'Escribir', ordena: 'Ordenar', parejas: 'Parejas' };

const EXAMPLES = ['quiz sobre el tema 2', '15 preguntas difíciles del tema 1', 'verdadero o falso del último tema'];

/** Lo que se está preguntando ahora, para guardarlo y repetirlo. */
interface Current {
  level: QuizLevel;
  count: number;
  request?: string;
  focus?: string;
  sections?: string[];
}

export default function QuizTab({ note, request }: { note: Note; request?: { text: string; key: number } }) {
  const { state, update } = useApp();
  const cards = noteCards(state, note.id);
  const sections = useMemo(() => splitSections(note.markdown), [note.markdown]);
  const [ask, setAsk] = useState('');
  const [current, setCurrent] = useState<Current | null>(null);
  const handled = useRef<number | null>(null);
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

  const make = async (reqText?: string) => {
    const parsed: QuizRequest | null = reqText?.trim() ? parseQuizRequest(reqText, sections) : null;
    const cur: Current = parsed
      ? { level: parsed.level ?? level, count: parsed.count ?? count, request: reqText!.trim(), focus: parsed.focus, sections: parsed.sections.map((x) => x.id) }
      : { level, count };
    setCurrent(cur);
    setBusy(true);
    setErr('');
    try {
      const { generateQuiz, generateFocusedQuiz } = await import('../../ai/tasks');
      const list = parsed
        ? await generateFocusedQuiz(state.settings, note, { request: cur.request!, sections: parsed.sections, types: parsed.types }, cur.level, cur.count)
        : await generateQuiz(state.settings, note, level, count);
      if (!list.length) throw new Error('La IA no ha devuelto preguntas válidas. Prueba otra vez.');
      setAsk('');
      begin(list);
    } catch (e) {
      const { describeAiError } = await import('../../ai/tasks');
      setErr(describeAiError(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!request || handled.current === request.key) return;
    handled.current = request.key;
    void make(request.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.key]);

  const levelName = (l: QuizLevel) => LEVELS.find((x) => x.id === l)!.label.toLowerCase();
  if (busy && current)
    return <Loading text={current.focus ? `Preparando ${current.count} preguntas a fondo sobre «${current.focus}»…` : `Preparando ${current.count} preguntas de nivel ${levelName(current.level)}…`} />;

  const focusBadge = current?.focus && (
    <div className="tag" style={{ alignSelf: 'flex-start', background: 'var(--accent-soft)', color: 'var(--accent)', whiteSpace: 'normal' }}>
      <Target size={14} /> {current.focus}
    </div>
  );

  if (qs && finished) {
    const correct = results.filter(Boolean).length;
    const pct = Math.round((100 * correct) / qs.length);
    const failed = qs.filter((_, k) => !results[k]);
    return (
      <div className="col fadein" style={{ gap: 16 }}>
        <section className="card pad col pop" style={{ alignItems: 'center', textAlign: 'center', gap: 6 }}>
          {current?.focus && <div className="muted small">🎯 {current.focus}</div>}
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
          {current?.request && (
            <button className="btn secondary grow" onClick={() => void make(current.request)}>
              <Target size={17} /> Otro de este tema
            </button>
          )}
          <button className="btn grow" onClick={() => (setQs(null), setCurrent(null))}>
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
        const rec = { at: Date.now(), level: current?.level ?? level, correct, total: qs.length };
        update((s) => recordQuiz(s, note.id, current?.focus ? { ...rec, focus: current.focus, sections: current.sections } : rec));
        setFinished(true);
      }
    };
    return (
      <div className="col" style={{ gap: 14 }}>
        {focusBadge}
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
  const preview = ask.trim() ? parseQuizRequest(ask, sections) : null;
  const mastery = sections.map((sec) => {
    const done = note.quizzes.filter((q) => q.sections?.includes(sec.id));
    const best = done.length ? Math.max(...done.map((q) => Math.round((100 * q.correct) / q.total))) : null;
    return { sec, best, times: done.length };
  });
  return (
    <div className="col fadein" style={{ gap: 16 }}>
      <section className="card pad col" style={{ gap: 12 }}>
        <div>
          <h2>Pide tu quiz</h2>
          <p className="muted small">Escríbelo como en un chat y te pregunto solo de eso, a fondo. Por ejemplo: «{EXAMPLES[0]}».</p>
        </div>
        <form
          className="composer"
          style={{ position: 'static', boxShadow: 'none' }}
          onSubmit={(e) => {
            e.preventDefault();
            if (ask.trim()) void make(ask);
          }}
        >
          <label className="sr" htmlFor="quizask">
            Tu quiz a medida
          </label>
          <textarea
            id="quizask"
            rows={1}
            value={ask}
            placeholder="Quiz sobre el tema 2…"
            onChange={(e) => setAsk(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (ask.trim()) void make(ask);
              }
            }}
          />
          <button type="submit" className="btn" style={{ width: 46, height: 46, padding: 0, minHeight: 46 }} aria-label="Crear quiz a medida" disabled={!ask.trim()}>
            <SendHorizontal size={20} />
          </button>
        </form>
        {preview ? (
          <div className="row wrap fadein" style={{ gap: 6 }} aria-live="polite">
            <span className="tag" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', whiteSpace: 'normal' }}>
              {preview.sections.length ? '🎯' : '🔎'} {preview.sections.length ? preview.focus : 'La IA buscará eso en tus apuntes'}
            </span>
            <span className="tag">{preview.count ?? count} preguntas</span>
            <span className="tag">Nivel {levelName(preview.level ?? level)}</span>
            {preview.types?.map((t) => (
              <span key={t} className="tag">
                {TYPE_LABEL[t]}
              </span>
            ))}
          </div>
        ) : (
          <div className="row wrap" style={{ gap: 6 }}>
            {(sections.length >= 2 ? sections.map((x) => `quiz sobre el tema ${x.n}`).slice(0, 8) : EXAMPLES).map((ex) => (
              <button key={ex} className="chip" onClick={() => setAsk(ex)}>
                {ex.replace(/^quiz sobre el tema (\d+)$/, (_, n) => `Tema ${n} · ${cleanTitle(sections[Number(n) - 1].title)}`)}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="card pad col" style={{ gap: 16 }}>
        <div>
          <h2>Ponte a prueba</h2>
          <p className="muted small">Preguntas variadas con pista y explicación. La dificultad y el número también se usan en tus quizzes a medida si no dices otra cosa.</p>
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
          <Sparkles size={18} /> Quiz de toda la nota
        </button>
        {cards.length >= 4 && (
          <button className="btn secondary block" onClick={() => (setCurrent(null), begin(quizFromCards(cards, count)))}>
            <Zap size={18} /> Quiz rápido con mis tarjetas (sin IA)
          </button>
        )}
        {err && <div className="alert bad">{err}</div>}
      </section>
      {sections.length >= 2 && (
        <section className="col" style={{ gap: 8 }}>
          <h3>Tu dominio por tema</h3>
          {mastery.map(({ sec, best, times }) => (
            <div key={sec.n} className="row soft" style={{ gap: 10 }}>
              <div className="grow col" style={{ gap: 4, minWidth: 0 }}>
                <span className="small" style={{ fontWeight: 600 }}>
                  Tema {sec.n} · {cleanTitle(sec.title)}
                </span>
                <div className="bar" style={{ height: 6 }}>
                  <span style={{ width: `${best ?? 0}%`, background: best === null ? 'transparent' : best >= 80 ? 'var(--good)' : best >= 50 ? 'var(--warn)' : 'var(--bad)' }} />
                </div>
                <span className="muted small">{best === null ? 'Aún sin practicar' : `Mejor nota ${best}% · ${times} ${times === 1 ? 'quiz' : 'quizzes'}`}</span>
              </div>
              <button className="btn secondary sm" aria-label={`Quiz del tema ${sec.n}`} onClick={() => void make(`quiz sobre el tema ${sec.n}`)}>
                <Target size={15} /> Quiz
              </button>
            </div>
          ))}
        </section>
      )}
      {history.length > 0 && (
        <section className="col" style={{ gap: 8 }}>
          <h3>Tus últimos quizzes</h3>
          {history.map((h, k) => {
            const pct = Math.round((100 * h.correct) / h.total);
            return (
              <div key={k} className="row soft">
                <span className="grow small">
                  {h.focus ? `🎯 ${h.focus} · ` : ''}
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
