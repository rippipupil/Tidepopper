// Tus quizzes guardados: tócalo para jugar; con tu mejor nota y cuántas veces lo has hecho.
import { Play, Trash2 } from 'lucide-react';
import { useApp } from '../data/store';
import { bestScore, deleteQuiz } from '../data/actions';
import { LEVEL_LABEL } from '../data/quizzes';
import { go } from '../router';
import type { SavedQuiz } from '../data/types';
import { timeAgo } from './ui';

export default function QuizList({ quizzes, from, showNote = false }: { quizzes: SavedQuiz[]; from: string; showNote?: boolean }) {
  const { state, update } = useApp();
  return (
    <div className="col" style={{ gap: 8 }}>
      {quizzes.map((q) => {
        const note = state.notes.find((n) => n.id === q.noteId);
        const best = bestScore(q);
        return (
          <div key={q.id} className="card row quiz-item" style={{ gap: 4, padding: '6px 6px 6px 14px' }}>
            <button className="grow row" style={{ gap: 12, textAlign: 'left', padding: '8px 0', minWidth: 0, background: 'none', border: 0, color: 'inherit' }} onClick={() => go(`/quiz/${q.id}?from=${from}`)} aria-label={`Jugar ${q.title}`}>
              <span style={{ fontSize: 26 }}>{q.fromCards ? '⚡' : q.focus ? '🎯' : note?.emoji ?? '📝'}</span>
              <span className="grow col" style={{ gap: 3, minWidth: 0 }}>
                <span style={{ fontWeight: 650, lineHeight: 1.3 }}>{q.title}</span>
                <span className="muted small">
                  {q.steps.length} preguntas · {LEVEL_LABEL[q.level]}
                  {showNote && note ? ` · ${note.emoji} ${note.title}` : ''} · {timeAgo(q.createdAt)}
                </span>
              </span>
              {best === null ? (
                <span className="tag" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  <Play size={13} /> Jugar
                </span>
              ) : (
                <span className={`tag ${best >= 80 ? 'pill-good' : best >= 50 ? 'pill-warn' : 'pill-bad'}`}>{best}%</span>
              )}
            </button>
            <button className="iconbtn" aria-label={`Borrar ${q.title}`} onClick={() => confirm(`¿Borrar el quiz «${q.title}»?`) && update((s) => deleteQuiz(s, q.id))}>
              <Trash2 size={17} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
