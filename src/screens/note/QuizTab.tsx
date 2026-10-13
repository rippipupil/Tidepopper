import { useMemo } from 'react';
import { Sparkles, Target } from 'lucide-react';
import { useApp } from '../../data/store';
import { cleanTitle, splitSections } from '../../logic/sections';
import type { Note } from '../../data/types';
import { go } from '../../router';
import QuizList from '../../components/QuizList';

/** Los quizzes de esta nota y tu dominio por tema. Los quizzes se crean en la pantalla «Quizzes». */
export default function QuizTab({ note }: { note: Note }) {
  const { state } = useApp();
  const sections = useMemo(() => splitSections(note.markdown), [note.markdown]);
  const quizzes = state.quizzes.filter((q) => q.noteId === note.id);
  const toCreate = (request = '') => go(`/quizzes?nota=${encodeURIComponent(note.id)}${request ? `&pedir=${encodeURIComponent(request)}` : ''}`);

  const mastery = sections.map((sec) => {
    const done = note.quizzes.filter((q) => q.sections?.includes(sec.id));
    const best = done.length ? Math.max(...done.map((q) => Math.round((100 * q.correct) / q.total))) : null;
    return { sec, best, times: done.length };
  });

  return (
    <div className="col fadein" style={{ gap: 16 }}>
      <section className="card pad col" style={{ gap: 10 }}>
        <div>
          <h2>Ponte a prueba</h2>
          <p className="muted small">Crea quizzes interactivos con IA sobre toda la nota o sobre un tema, eligiendo la dificultad y cuántas preguntas.</p>
        </div>
        <button className="btn block" onClick={() => toCreate()}>
          <Sparkles size={18} /> Crear un quiz de esta nota
        </button>
      </section>
      {quizzes.length > 0 && (
        <section className="col" style={{ gap: 8 }}>
          <h3>Tus quizzes de esta nota</h3>
          <QuizList quizzes={quizzes} from="nota" />
        </section>
      )}
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
              <button className="btn secondary sm" aria-label={`Quiz del tema ${sec.n}`} onClick={() => toCreate(`quiz sobre el tema ${sec.n}`)}>
                <Target size={15} /> Quiz
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
