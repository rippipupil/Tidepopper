import { pickDistractors } from './distractors';

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
