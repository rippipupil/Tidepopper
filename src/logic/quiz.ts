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

/** Preguntas de elegir la respuesta correcta entre 4, usando las otras tarjetas como señuelos. */
export function buildQuiz(cards: { id: string; front: string; back: string }[], count: number, rnd: () => number = Math.random): QuizItem[] {
  const pool = cards.filter((c, k, all) => all.findIndex((x) => x.back === c.back) === k);
  if (pool.length < 4) return [];
  return shuffle(pool, rnd)
    .slice(0, count)
    .map((c) => {
      const decoys = shuffle(pool.filter((x) => x.id !== c.id), rnd).slice(0, 3).map((x) => x.back);
      const options = shuffle([c.back, ...decoys], rnd);
      return { cardId: c.id, prompt: c.front, options, answer: options.indexOf(c.back) };
    });
}
