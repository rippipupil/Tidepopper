// Lecciones interactivas: pasos cortos que alternan una idea y un ejercicio.
import type { LessonStep, LevelContent, LevelQuestion } from '../data/types';
import { checkWritten } from './games';

export const EXERCISES = ['elige', 'vf', 'hueco', 'ordena', 'parejas', 'escribe'] as const;

export function isExercise(s: LessonStep): boolean {
  return s.type !== 'explica';
}

const clean = (xs: string[] | undefined) => (xs ?? []).map((x) => String(x).trim()).filter(Boolean);
const uniq = (xs: string[]) => xs.length === new Set(xs.map((x) => x.toLowerCase())).size;

/** Arregla o quita los pasos que la IA haya devuelto mal, para que nunca se rompa la lección. */
export function cleanSteps(steps: LessonStep[]): LessonStep[] {
  const out: LessonStep[] = [];
  for (const raw of steps) {
    const s: LessonStep = {
      type: raw.type,
      emoji: (raw.emoji ?? '').trim().slice(0, 8),
      text: (raw.text ?? '').trim(),
      example: (raw.example ?? '').trim(),
      options: clean(raw.options),
      answer: Number.isInteger(raw.answer) ? raw.answer : -1,
      pairs: (raw.pairs ?? []).map((p) => ({ a: String(p.a ?? '').trim(), b: String(p.b ?? '').trim() })).filter((p) => p.a && p.b),
      accepted: clean(raw.accepted),
      explanation: (raw.explanation ?? '').trim(),
    };
    if (!s.text && s.type !== 'parejas') continue;
    switch (s.type) {
      case 'explica':
        break;
      case 'elige':
        if (s.options.length < 2 || s.answer < 0 || s.answer >= s.options.length) continue;
        break;
      case 'hueco':
        if (s.options.length < 2 || s.answer < 0 || s.answer >= s.options.length) continue;
        // Sin hueco marcado se juega como «elige».
        if (!/_{2,}/.test(s.text)) s.type = 'elige';
        break;
      case 'vf':
        if (s.answer !== 0 && s.answer !== 1) continue;
        break;
      case 'ordena':
        if (s.options.length < 3 || !uniq(s.options)) continue;
        s.options = s.options.slice(0, 6);
        break;
      case 'parejas':
        s.pairs = s.pairs.filter((p, k, all) => all.findIndex((x) => x.a.toLowerCase() === p.a.toLowerCase() || x.b.toLowerCase() === p.b.toLowerCase()) === k).slice(0, 5);
        if (s.pairs.length < 3) continue;
        if (!s.text) s.text = 'Une cada pareja.';
        break;
      case 'escribe':
        if (s.accepted.length === 0) continue;
        break;
      default:
        continue;
    }
    out.push(s);
  }
  return out;
}

const blank = (): Omit<LessonStep, 'type' | 'text'> => ({ emoji: '', example: '', options: [], answer: -1, pairs: [], accepted: [], explanation: '' });

/** Los pasos de un nivel; los niveles antiguos (texto + test) se convierten intercalando párrafos y preguntas. */
export function stepsOf(c: LevelContent): LessonStep[] {
  if (c.steps?.length) return c.steps;
  const paras = c.lesson.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const qs = c.quiz.map((q): LessonStep => ({ ...blank(), type: 'elige', text: q.prompt, options: q.options, answer: q.answer, explanation: q.explanation }));
  const out: LessonStep[] = [];
  const per = paras.length ? Math.ceil(qs.length / paras.length) : qs.length;
  let qi = 0;
  for (const p of paras) {
    out.push({ ...blank(), type: 'explica', text: p });
    for (let k = 0; k < per && qi < qs.length; k++) out.push(qs[qi++]);
  }
  while (qi < qs.length) out.push(qs[qi++]);
  return out;
}

/** Texto seguido de la lección (para el resumen del estudio). */
export function lessonText(steps: LessonStep[]): string {
  return steps
    .filter((s) => s.type === 'explica')
    .map((s) => (s.example ? `${s.text}\nEjemplo: ${s.example}` : s.text))
    .join('\n\n');
}

/** Las preguntas tipo test de la lección (compatibilidad con el formato antiguo). */
export function quizOf(steps: LessonStep[]): LevelQuestion[] {
  return steps.filter((s) => s.type === 'elige').map((s) => ({ prompt: s.text, options: s.options, answer: s.answer, explanation: s.explanation }));
}

export function checkChoice(s: LessonStep, k: number): boolean {
  return k === s.answer;
}

export function checkOrder(s: LessonStep, order: string[]): boolean {
  return order.length === s.options.length && order.every((x, k) => x === s.options[k]);
}

export function checkWrite(s: LessonStep, text: string): boolean {
  return s.accepted.some((a) => checkWritten(text, a) !== 'wrong');
}

/** En «parejas» se aprueba con un fallo como mucho. */
export function pairsPassed(misses: number): boolean {
  return misses <= 1;
}

export function shuffled<T>(xs: T[], rnd: () => number = Math.random): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Desordena sin dejarlo igual que el orden correcto (si se puede). */
export function scrambledOrder(xs: string[], rnd: () => number = Math.random): string[] {
  for (let k = 0; k < 8; k++) {
    const s = shuffled(xs, rnd);
    if (s.some((x, i) => x !== xs[i])) return s;
  }
  return xs.slice().reverse();
}

const PRAISE = ['¡Exacto!', '¡Eso es!', '¡Muy bien!', '¡Crack!', '¡Perfecto!', '¡Lo tienes!'];
const ENCOURAGE = ['¡Casi!', 'Uy, no era esa.', 'No pasa nada, sigue.', '¡A la próxima!'];

export function praise(n: number): string {
  return PRAISE[n % PRAISE.length];
}

export function encourage(n: number): string {
  return ENCOURAGE[n % ENCOURAGE.length];
}
