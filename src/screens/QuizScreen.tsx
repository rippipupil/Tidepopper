import { useState } from 'react';
import { useApp } from '../data/store';
import { saveQuiz } from '../data/actions';
import { againOptions, createQuiz } from '../data/quizzes';
import { go } from '../router';
import QuizPlayer from '../components/QuizPlayer';
import { Loading, TopBar } from '../components/ui';

/** Jugar un quiz guardado. Vuelve a donde lo abriste (la nota, su chat o Quizzes). */
export default function QuizScreen({ id, from }: { id: string; from?: string }) {
  const { state, update } = useApp();
  const quiz = state.quizzes.find((q) => q.id === id);
  const note = quiz && state.notes.find((n) => n.id === quiz.noteId);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const back = !quiz || from === 'quizzes' ? '#/quizzes' : `#/nota/${quiz.noteId}?tab=${from === 'chat' ? 'chat' : 'quiz'}`;

  const again = async () => {
    if (!quiz || !note) return;
    setBusy(true);
    setErr('');
    try {
      const q = await createQuiz(state.settings, note, againOptions(quiz));
      update((s) => saveQuiz(s, q));
      window.location.replace(`#/quiz/${q.id}?from=${from ?? 'nota'}`);
    } catch (e) {
      const { describeAiError } = await import('../ai/tasks');
      setErr(describeAiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app">
      <TopBar back={back} title={quiz ? <span>{quiz.title}</span> : 'Quiz'} />
      <main className="page" style={{ gap: 16 }}>
        {!quiz ? (
          <div className="col" style={{ gap: 12 }}>
            <p className="muted">Este quiz ya no existe.</p>
            <button className="btn" onClick={() => go('/quizzes')}>
              Ver mis quizzes
            </button>
          </div>
        ) : busy ? (
          <Loading text={quiz.focus ? `La IA está creando preguntas nuevas sobre «${quiz.focus}»…` : 'La IA está creando preguntas nuevas…'} />
        ) : (
          <>
            {err && <div className="alert bad">{err}</div>}
            <QuizPlayer key={quiz.id} quiz={quiz} note={note} onNew={note ? () => void again() : undefined} />
          </>
        )}
      </main>
    </div>
  );
}
