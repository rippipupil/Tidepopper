import { useState } from 'react';
import { useApp } from '../data/store';
import { createCourse } from '../data/actions';
import { uid } from '../data/db';
import { newLevel } from '../logic/course';
import { go } from '../router';
import type { Course } from '../data/types';
import { Header, icon, Nav } from '../components/ui';

const STARTS: { id: Course['start']; label: string }[] = [
  { id: 'cero', label: 'Desde cero' },
  { id: 'basico', label: 'Sé lo básico' },
  { id: 'avanzado', label: 'Avanzado' },
];
const IDEAS = ['Código morse', 'Inglés para viajar', 'Historia de Roma', 'Programar en Python', 'Primeros auxilios'];

export default function CourseNew() {
  const { state, update } = useApp();
  const [topic, setTopic] = useState('');
  const [goal, setGoal] = useState('');
  const [start, setStart] = useState<Course['start']>('cero');
  const [levels, setLevels] = useState(8);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const courses = state.studies.filter((s) => s.course);

  const create = async () => {
    setBusy(true);
    setErr('');
    try {
      const { generateCourseOutline } = await import('../ai/claude');
      const o = await generateCourseOutline(state.settings, topic.trim(), goal.trim(), start, levels);
      const course: Course = { topic: topic.trim(), goal: goal.trim(), start, description: o.description, levels: o.levels.map((l) => newLevel(l.title, l.goal)) };
      const id = uid();
      update((s) => createCourse(s, id, o.title || topic.trim(), course, Date.now()));
      go(`/curso/${id}`);
    } catch (e) {
      const { describeAiError } = await import('../ai/claude');
      setErr(describeAiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen">
      <Header title="Asistente IA">
        <img src={icon('ai')} alt="" width={40} height={40} />
      </Header>
      <div className="lcd" style={{ padding: '12px 16px', fontSize: 20 }}>
        &gt; DIME UN TEMA Y TE PREPARO UN CURSO POR NIVELES
      </div>
      <form
        className="px"
        style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (topic.trim()) void create();
        }}
      >
        <div>
          <label className="lbl" htmlFor="topic" style={{ color: 'var(--blue-sh)' }}>
            ¿QUÉ QUIERES APRENDER?
          </label>
          <input id="topic" className="field" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ej.: Código morse" />
          <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {IDEAS.map((i) => (
              <button key={i} type="button" className="btn ghost" style={{ minHeight: 32, padding: '4px 10px', fontSize: 13 }} onClick={() => setTopic(i)}>
                {i}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="lbl" htmlFor="goal" style={{ color: 'var(--blue-sh)' }}>
            ¿PARA QUÉ? (OPCIONAL)
          </label>
          <input id="goal" className="field" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ej.: entender mensajes reales" />
        </div>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="lbl" style={{ color: 'var(--blue-sh)' }}>
            TU NIVEL
          </legend>
          <div className="grid3">
            {STARTS.map((s) => (
              <button key={s.id} type="button" aria-pressed={start === s.id} className={start === s.id ? 'btn' : 'btn ghost'} style={{ padding: '10px 4px', fontSize: 14 }} onClick={() => setStart(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="row" style={{ fontFamily: 'var(--f-pixel)', fontSize: 18, color: 'var(--blue-sh)' }}>
          NIVELES
          <input type="range" min={4} max={12} value={levels} onChange={(e) => setLevels(Number(e.target.value))} className="grow" />
          <span style={{ width: 24, color: 'var(--ink)' }}>{levels}</span>
        </label>
        <button type="submit" className="btn gold" disabled={busy || !topic.trim()}>
          {busy ? 'Diseñando tu curso…' : 'Crear curso'}
        </button>
      </form>
      {err && (
        <div className="lcd toast" role="status" style={{ color: 'var(--coral)', fontSize: 19 }}>
          {err}
        </div>
      )}
      {courses.length > 0 && (
        <section>
          <h2 style={{ marginBottom: 6 }}>Mis cursos</h2>
          {courses.map((s) => {
            const c = s.course!;
            const done = c.levels.filter((l) => l.done).length;
            return (
              <a key={s.id} href={`#/curso/${s.id}`} className="row" style={{ textDecoration: 'none', color: 'var(--text)', padding: '12px 2px', borderBottom: '2px dashed var(--lcd-hi)', fontWeight: 600 }}>
                <img src="img/icons/i-folder-mint.svg" alt="" width={26} height={26} />
                <span className="grow">{s.name}</span>
                <span className="vt" style={{ color: 'var(--glow)' }}>
                  NIVEL {Math.min(done + 1, c.levels.length)}/{c.levels.length}
                </span>
              </a>
            );
          })}
        </section>
      )}
      <Nav active="inicio" />
    </main>
  );
}
