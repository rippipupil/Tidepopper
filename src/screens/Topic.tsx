import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useApp } from '../data/store';
import { addNote, newNote } from '../data/actions';
import { courseMarkdown } from '../data/migrate';
import { uid } from '../data/db';
import { newLevel } from '../logic/course';
import { go } from '../router';
import type { Course } from '../data/types';
import { TopBar } from '../components/ui';

const STARTS: { id: Course['start']; label: string }[] = [
  { id: 'cero', label: 'Desde cero' },
  { id: 'basico', label: 'Sé lo básico' },
  { id: 'avanzado', label: 'Avanzado' },
];
const IDEAS = ['Código morse', 'Inglés para viajar', 'Historia de Roma', 'Programar en Python', 'Primeros auxilios', 'Finanzas personales'];

/** «Aprender un tema»: la IA diseña un curso por niveles con lecciones interactivas. */
export default function Topic() {
  const { state, update } = useApp();
  const [topic, setTopic] = useState('');
  const [goal, setGoal] = useState('');
  const [start, setStart] = useState<Course['start']>('cero');
  const [levels, setLevels] = useState(8);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const create = async () => {
    setBusy(true);
    setErr('');
    try {
      const { generateCourseOutline } = await import('../ai/tasks');
      const o = await generateCourseOutline(state.settings, topic.trim(), goal.trim(), start, levels);
      const course: Course = { topic: topic.trim(), goal: goal.trim(), start, description: o.description, levels: o.levels.map((l) => newLevel(l.title, l.goal)) };
      const id = uid();
      const note = newNote(id, Date.now(), {
        title: o.title || topic.trim(),
        emoji: '🧭',
        summary: o.description,
        markdown: courseMarkdown(course),
        sources: [{ id: uid(), kind: 'topic', name: topic.trim(), addedAt: Date.now() }],
        course,
      });
      update((s) => addNote(s, note));
      go(`/nota/${id}?tab=lecciones`);
    } catch (e) {
      const { describeAiError } = await import('../ai/tasks');
      setErr(describeAiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app">
      <TopBar back="#/" title="Aprender un tema" />
      <main className="page">
        <div className="hero col" style={{ gap: 6 }}>
          <div style={{ fontSize: 34 }}>🧭</div>
          <h1>Dime qué quieres aprender</h1>
          <p className="muted">La IA te prepara un curso por niveles con lecciones interactivas, tarjetas y ejercicios.</p>
        </div>
        <form
          className="card pad col"
          style={{ gap: 18 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (topic.trim()) void create();
          }}
        >
          <div className="col" style={{ gap: 8 }}>
            <label className="label" htmlFor="topic">
              Tema
            </label>
            <input id="topic" className="field" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ej.: Código morse" />
            <div className="row wrap" style={{ gap: 8 }}>
              {IDEAS.map((i) => (
                <button key={i} type="button" className="chip" onClick={() => setTopic(i)}>
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div className="col" style={{ gap: 8 }}>
            <label className="label" htmlFor="goal">
              ¿Para qué? (opcional)
            </label>
            <input id="goal" className="field" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ej.: entender mensajes reales" />
          </div>
          <div className="col" style={{ gap: 8 }}>
            <span className="label">Tu nivel</span>
            <div className="row wrap" style={{ gap: 8 }}>
              {STARTS.map((s) => (
                <button key={s.id} type="button" className="chip" aria-pressed={start === s.id} onClick={() => setStart(s.id)} style={{ padding: '9px 16px', fontSize: 14 }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <label className="col" style={{ gap: 8 }}>
            <span className="label">Niveles: {levels}</span>
            <input type="range" min={4} max={12} value={levels} onChange={(e) => setLevels(Number(e.target.value))} />
          </label>
          <button type="submit" className="btn block" disabled={busy || !topic.trim()}>
            {busy ? <div className="spinner" /> : <Sparkles size={18} />}
            {busy ? 'Diseñando tu curso…' : 'Crear curso'}
          </button>
          {err && <div className="alert bad">{err}</div>}
        </form>
      </main>
    </div>
  );
}
