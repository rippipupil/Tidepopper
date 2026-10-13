import { describe, expect, it } from 'vitest';
import { addNote, bestScore, deleteNote, deleteQuiz, hydrate, initialState, newNote, recordAttempt, saveQuiz } from './actions';
import type { SavedQuiz } from './types';

const quiz = (id: string, noteId = 'n1'): SavedQuiz => ({ id, noteId, title: 'Tema 2 · Tipos', focus: 'Tema 2 · Tipos', sections: ['tipos'], level: 'examen', steps: [], createdAt: 1, attempts: [] });

describe('quizzes guardados', () => {
  it('se guardan, cuentan intentos (también en el dominio por tema) y se borran', () => {
    let s = addNote(initialState(), newNote('n1', 1));
    s = saveQuiz(saveQuiz(s, quiz('a')), quiz('b'));
    expect(s.quizzes.map((q) => q.id)).toEqual(['b', 'a']);
    s = recordAttempt(s, 'a', 6, 10, 50);
    s = recordAttempt(s, 'a', 9, 10, 60);
    expect(bestScore(s.quizzes.find((q) => q.id === 'a')!)).toBe(90);
    expect(s.notes[0].quizzes.at(-1)).toEqual({ at: 60, level: 'examen', correct: 9, total: 10, focus: 'Tema 2 · Tipos', sections: ['tipos'] });
    expect(deleteQuiz(s, 'a').quizzes.map((q) => q.id)).toEqual(['b']);
    expect(deleteNote(s, 'n1').quizzes).toEqual([]);
  });
  it('los datos antiguos sin quizzes cargan bien', () => {
    expect(hydrate({ version: 2, notes: [], folders: [], cards: [], chats: {} }).quizzes).toEqual([]);
  });
});
