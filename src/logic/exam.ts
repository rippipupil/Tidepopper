import { pickWrong } from './distractors';
import { buildQuiz } from './quiz';
import { streakMultiplier } from './rewards';

export type ExamQuestion =
  | { kind: 'choice'; prompt: string; options: string[]; answer: number; explanation?: string }
  | { kind: 'truefalse'; prompt: string; statement: string; answer: boolean; explanation?: string }
  | { kind: 'open'; prompt: string; reference: string };

export type ExamAnswer = number | boolean | string | null;

function shuffle<T>(xs: T[], rnd: () => number): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Examen sin IA a partir de las tarjetas: 7 de cada 10 tipo test y el resto verdadero/falso. */
export function buildQuickExam(cards: { id: string; front: string; back: string; wrong?: string[] }[], n = 10, rnd: () => number = Math.random): ExamQuestion[] {
  const quiz = buildQuiz(cards, n, rnd);
  if (quiz.length === 0) return [];
  const backs = Array.from(new Set(cards.map((c) => c.back)));
  return quiz.map((q, k): ExamQuestion => {
    if (k % 10 < 7) return { kind: 'choice', prompt: `¿Qué es «${q.prompt}»?`, options: q.options, answer: q.answer };
    const correct = q.options[q.answer];
    const truth = rnd() < 0.5;
    const wrong = pickWrong(correct, cards.find((c) => c.id === q.cardId)?.wrong, backs, rnd) ?? shuffle(backs.filter((b) => b !== correct), rnd)[0];
    return {
      kind: 'truefalse',
      prompt: q.prompt,
      statement: truth ? correct : wrong,
      answer: truth,
      explanation: truth ? undefined : `En realidad: ${correct}`,
    };
  });
}

/** 1 si es correcta, 0 si no. Las de desarrollo se puntúan aparte (la IA, de 0 a 10). */
export function gradeObjective(q: ExamQuestion, a: ExamAnswer): number {
  if (q.kind === 'choice') return a === q.answer ? 1 : 0;
  if (q.kind === 'truefalse') return a === q.answer ? 1 : 0;
  return 0;
}

/** Nota sobre 10 con un decimal a partir de los puntos de cada pregunta (0–1). */
export function examScore(points: number[]): number {
  if (points.length === 0) return 0;
  const sum = points.reduce((x, y) => x + Math.max(0, Math.min(1, y)), 0);
  return Math.round((100 * sum) / points.length) / 10;
}

export function gradeLabel(score: number): string {
  return score < 5 ? 'Suspenso' : score < 7 ? 'Aprobado' : score < 9 ? 'Notable' : 'Sobresaliente';
}

export function formatScore(score: number): string {
  return score.toLocaleString('es-ES', { minimumFractionDigits: score % 1 ? 1 : 0, maximumFractionDigits: 1 });
}

/** Un examen paga más que una sesión: es el "jefe" del estudio. */
export function examReward(score: number, streakDays: number): { coins: number; xp: number; gems: number; stars: number } {
  const passed = score >= 5;
  return {
    coins: passed ? Math.round(score * 25 * streakMultiplier(streakDays)) : Math.round(score * 5),
    xp: 40 + Math.round(score * 10),
    gems: score >= 9 ? 1 : 0,
    stars: score >= 9 ? 3 : score >= 7 ? 2 : passed ? 1 : 0,
  };
}

/** Días que faltan para una fecha AAAA-MM-DD (0 = hoy, negativo = ya pasó). */
export function daysUntil(date: string, now: number): number {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const t = new Date(now);
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  return Math.round((target - today) / 86_400_000);
}
