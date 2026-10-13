// Crear quizzes con IA (a medida o de toda la nota) y guardarlos para jugarlos cuando quieras.
import type { AiKeys } from '../ai/tasks';
import type { LessonStep, Note, QuizLevel, SavedQuiz } from './types';
import { parseQuizRequest, splitSections } from '../logic/sections';
import { uid } from './db';

export const LEVEL_LABEL: Record<QuizLevel, string> = { basico: 'Básico', medio: 'Medio', examen: 'Examen' };

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function make(note: Note, steps: LessonStep[], level: QuizLevel, extra: Partial<SavedQuiz> & { title: string }): SavedQuiz {
  return { id: uid(), noteId: note.id, level, steps, createdAt: Date.now(), attempts: [], ...extra };
}

/**
 * Pide a la IA un quiz interactivo con esa dificultad y número de preguntas. Con petición
 * («quiz sobre el tema 2», «verdadero o falso del último tema») pregunta solo de eso y a fondo;
 * sin ella, de toda la nota.
 */
export async function createQuiz(keys: AiKeys, note: Note, opts: { request?: string; level: QuizLevel; count: number }): Promise<SavedQuiz> {
  const { generateQuiz, generateFocusedQuiz } = await import('../ai/tasks');
  const request = opts.request?.trim();
  if (!request) {
    const steps = await generateQuiz(keys, note, opts.level, opts.count);
    if (!steps.length) throw new Error('La IA no ha devuelto preguntas válidas. Prueba otra vez.');
    return make(note, steps, opts.level, { title: `Quiz de «${note.title}»` });
  }
  const parsed = parseQuizRequest(request, splitSections(note.markdown));
  const level = opts.level;
  const steps = await generateFocusedQuiz(keys, note, { request, sections: parsed.sections, types: parsed.types }, level, opts.count);
  if (!steps.length) throw new Error('La IA no ha devuelto preguntas válidas. Prueba otra vez.');
  return make(note, steps, level, {
    title: parsed.sections.length ? parsed.focus : capital(request.replace(/[.!?¿¡]+$/g, '')),
    request,
    ...(parsed.sections.length ? { focus: parsed.focus, sections: parsed.sections.map((s) => s.id) } : {}),
  });
}

/** Repite la misma petición para tener un quiz nuevo del mismo tema. */
export function againOptions(q: SavedQuiz): { request?: string; level: QuizLevel; count: number } {
  return { request: q.request, level: q.level, count: q.steps.length };
}
