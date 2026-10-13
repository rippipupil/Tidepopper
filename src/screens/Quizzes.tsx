import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useApp } from '../data/store';
import { dueCount } from '../logic/learn';
import { saveQuiz } from '../data/actions';
import { createQuiz, LEVEL_LABEL } from '../data/quizzes';
import { cleanTitle, parseQuizRequest, splitSections } from '../logic/sections';
import { go } from '../router';
import type { QuizLevel } from '../data/types';
import QuizList from '../components/QuizList';
import { BottomNav, Empty, Loading, TopBar } from '../components/ui';

const LEVELS: { id: QuizLevel; text: string }[] = [
  { id: 'basico', text: 'Lo principal' },
  { id: 'medio', text: 'Comprender y relacionar' },
  { id: 'examen', text: 'Casos y trampas' },
];
const COUNTS = [5, 10, 15, 20, 30];
const TYPE_LABEL: Record<string, string> = { elige: 'Tipo test', vf: 'Verdadero o falso', hueco: 'Huecos', escribe: 'Escribir', ordena: 'Ordenar', parejas: 'Parejas' };

/** Crear quizzes a medida con IA (con su dificultad y número de preguntas) y todos los que ya tienes. */
export default function Quizzes() {
  const { state, update } = useApp();
  const notes = useMemo(() => [...state.notes].sort((a, b) => b.updatedAt - a.updatedAt), [state.notes]);
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const [noteId, setNoteId] = useState(() => {
    const q = params.get('nota');
    return q && notes.some((n) => n.id === q) ? q : notes[0]?.id ?? '';
  });
  const [ask, setAsk] = useState(() => params.get('pedir') ?? '');
  const [level, setLevel] = useState<QuizLevel>('medio');
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<'todas' | string>('todas');
  const note = notes.find((n) => n.id === noteId);
  const sections = useMemo(() => splitSections(note?.markdown ?? ''), [note?.markdown]);
  const list = filter === 'todas' ? state.quizzes : state.quizzes.filter((q) => q.noteId === filter);
  const withQuizzes = notes.filter((n) => state.quizzes.some((q) => q.noteId === n.id));
  const preview = ask.trim() ? parseQuizRequest(ask, sections) : null;

  // Si escribe «15 preguntas difíciles…», las opciones se ponen solas.
  const write = (text: string) => {
    setAsk(text);
    const p = text.trim() ? parseQuizRequest(text, sections) : null;
    if (p?.level) setLevel(p.level);
    if (p?.count) setCount(p.count);
  };

  const create = async () => {
    if (!note) return;
    const request = ask.trim() || undefined;
    setBusy(preview?.sections.length ? `La IA está creando ${count} preguntas a fondo sobre «${preview.focus}»…` : request ? `La IA está creando ${count} preguntas sobre «${request}»…` : `La IA está creando ${count} preguntas de «${note.title}»…`);
    setErr('');
    try {
      const q = await createQuiz(state.settings, note, { request, level, count });
      update((s) => saveQuiz(s, q));
      setAsk('');
      go(`/quiz/${q.id}?from=quizzes`);
    } catch (e) {
      const { describeAiError } = await import('../ai/tasks');
      setErr(describeAiError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="app">
      <TopBar title="Quizzes" />
      <main className="page" style={{ gap: 18 }}>
        {notes.length === 0 ? (
          <Empty icon="🎯" title="Aún no tienes notas">
            <p className="muted">Crea una nota con tu material y aquí podrás pedirle a la IA quizzes interactivos sobre ella.</p>
            <button className="btn" onClick={() => go('/')}>
              Crear una nota
            </button>
          </Empty>
        ) : busy ? (
          <Loading text={busy} />
        ) : (
          <section className="card pad col" style={{ gap: 14 }}>
            <div>
              <h2>Crea tu quiz con IA</h2>
              <p className="muted small">Escribe sobre qué quieres que te pregunte y elige la dificultad y cuántas preguntas. La IA te crea un quiz interactivo solo de eso.</p>
            </div>

            <div className="col" style={{ gap: 6 }}>
              <label className="label" htmlFor="quiznote">
                Nota
              </label>
              <select id="quiznote" className="field" value={noteId} onChange={(e) => setNoteId(e.target.value)}>
                {notes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.emoji} {n.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="col" style={{ gap: 6 }}>
              <label className="label" htmlFor="quizask">
                ¿Sobre qué?
              </label>
              <textarea
                id="quizask"
                className="field"
                style={{ minHeight: 96 }}
                value={ask}
                placeholder="Ej.: «quiz sobre el tema 2», «las fases de la mitosis», «verdadero o falso del último tema»… Déjalo vacío para preguntar de toda la nota."
                onChange={(e) => write(e.target.value)}
              />
              {sections.length >= 2 && (
                <div className="row wrap" style={{ gap: 6 }}>
                  {sections.slice(0, 10).map((x) => (
                    <button key={x.n} className="chip" aria-pressed={preview?.sections.length === 1 && preview.sections[0].n === x.n} onClick={() => write(`quiz sobre el tema ${x.n}`)}>
                      Tema {x.n} · {cleanTitle(x.title)}
                    </button>
                  ))}
                </div>
              )}
              <div className="row wrap" style={{ gap: 6 }} aria-live="polite">
                {(sections.length < 2 || preview?.sections.length !== 1) && (
                  <span className="tag" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', whiteSpace: 'normal' }}>
                    {!preview ? `📚 Toda la nota «${note?.title ?? ''}»` : preview.sections.length ? `🎯 ${preview.focus}` : '🔎 La IA buscará eso en tus apuntes'}
                  </span>
                )}
                {preview?.types?.map((t) => (
                  <span key={t} className="tag">
                    {TYPE_LABEL[t]}
                  </span>
                ))}
              </div>
            </div>

            <div className="col" style={{ gap: 8 }}>
              <span className="label">Dificultad</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {LEVELS.map((l) => (
                  <button key={l.id} className="chip" aria-pressed={level === l.id} onClick={() => setLevel(l.id)} style={{ flexDirection: 'column', gap: 2, padding: '10px 6px', whiteSpace: 'normal', borderRadius: 16 }}>
                    <b style={{ fontSize: 14 }}>{LEVEL_LABEL[l.id]}</b>
                    <span style={{ fontSize: 11 }}>{l.text}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="col" style={{ gap: 8 }}>
              <span className="label">Preguntas</span>
              <div className="row wrap" style={{ gap: 8 }}>
                {[...COUNTS, ...(COUNTS.includes(count) ? [] : [count])].sort((a, b) => a - b).map((n) => (
                  <button key={n} className="chip" aria-pressed={count === n} onClick={() => setCount(n)} style={{ padding: '8px 16px' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn block" onClick={() => void create()}>
              <Sparkles size={18} /> Crear quiz
            </button>
            {err && <div className="alert bad">{err}</div>}
          </section>
        )}

        {notes.length > 0 && !busy && (
          <section className="col" style={{ gap: 10 }}>
            <h2>Tus quizzes</h2>
            {state.quizzes.length === 0 ? (
              <p className="muted small">Aquí se guardan todos los quizzes que crees (también los que pidas en el chat de una nota) para jugarlos cuando quieras.</p>
            ) : (
              <>
                {withQuizzes.length > 1 && (
                  <div className="row wrap" style={{ gap: 6 }}>
                    <button className="chip" aria-pressed={filter === 'todas'} onClick={() => setFilter('todas')}>
                      Todas
                    </button>
                    {withQuizzes.map((n) => (
                      <button key={n.id} className="chip" aria-pressed={filter === n.id} onClick={() => setFilter(n.id)}>
                        {n.emoji} {n.title}
                      </button>
                    ))}
                  </div>
                )}
                <QuizList quizzes={list} from="quizzes" showNote={filter === 'todas'} />
              </>
            )}
          </section>
        )}
      </main>
      <BottomNav active="quizzes" due={dueCount(state.cards, Date.now())} />
    </div>
  );
}
