import type { LessonStep } from '../data/types';
import { pickDistractors, pickWrong } from './distractors';

export interface QuizItem {
  cardId: string;
  prompt: string;
  options: string[];
  answer: number;
}

function shuffle<T>(xs: T[], rnd: () => number): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Preguntas de elegir la correcta entre 4. Los señuelos se parecen a la respuesta (ver distractors.ts). */
export function buildQuiz(cards: { id: string; front: string; back: string; wrong?: string[] }[], count: number, rnd: () => number = Math.random): QuizItem[] {
  const pool = cards.filter((c, k, all) => all.findIndex((x) => x.back === c.back) === k);
  if (pool.length < 4) return [];
  return shuffle(pool, rnd)
    .slice(0, count)
    .map((c) => {
      const decoys = pickDistractors(c.back, c.wrong, pool.filter((x) => x.id !== c.id).map((x) => x.back), 3, rnd);
      const options = shuffle([c.back, ...decoys], rnd);
      return { cardId: c.id, prompt: c.front, options, answer: options.indexOf(c.back) };
    });
}


const blank = (): Omit<LessonStep, 'type' | 'text'> => ({ emoji: '', example: '', options: [], answer: -1, pairs: [], accepted: [], explanation: '' });

/**
 * Quiz rápido sin IA a partir de las tarjetas: tipo test (con señuelos parecidos),
 * verdadero o falso y escribir el término.
 */
export function quizFromCards(cards: { id: string; front: string; back: string; wrong?: string[] }[], count: number, rnd: () => number = Math.random): LessonStep[] {
  const items = buildQuiz(cards, count, rnd);
  const backs = [...new Set(cards.map((c) => c.back))];
  return items.map((q, k): LessonStep => {
    const card = cards.find((c) => c.id === q.cardId)!;
    const correct = q.options[q.answer];
    const kind = k % 5;
    if (kind === 3) {
      const truth = rnd() < 0.5;
      const shown = truth ? correct : (pickWrong(correct, card.wrong, backs, rnd) ?? correct);
      return { ...blank(), type: 'vf', text: `«${card.front}»: ${shown}`, answer: shown === correct ? 1 : 0, explanation: `«${card.front}»: ${correct}` };
    }
    if (kind === 4 && [...card.front].length <= 40)
      return { ...blank(), type: 'escribe', text: `¿Qué es? ${card.back}`, accepted: [card.front], example: `Empieza por «${card.front.slice(0, 1)}»`, explanation: `Es «${card.front}».` };
    return { ...blank(), type: 'elige', text: card.front, options: q.options, answer: q.answer, explanation: `«${card.front}»: ${correct}` };
  });
}
