import type { Course, CourseLevel } from '../data/types';

export const PASS_PCT = 60;

export type LevelState = 'done' | 'current' | 'locked';

/** El nivel actual es el primero sin terminar; los de después están bloqueados. */
export function currentLevel(c: Course): number {
  const i = c.levels.findIndex((l) => !l.done);
  return i === -1 ? c.levels.length : i;
}

export function levelState(c: Course, i: number): LevelState {
  if (c.levels[i]?.done) return 'done';
  return i === currentLevel(c) ? 'current' : 'locked';
}

export function levelStars(pct: number): number {
  return pct >= 95 ? 3 : pct >= 75 ? 2 : pct >= PASS_PCT ? 1 : 0;
}

/** Registra un intento de práctica. Solo los niveles abiertos cuentan; aprobar con ≥60 % lo completa. */
export function completeLevel(c: Course, i: number, pct: number): { course: Course; passed: boolean; stars: number; firstPass: boolean } {
  const lv = c.levels[i];
  if (!lv || levelState(c, i) === 'locked') return { course: c, passed: false, stars: 0, firstPass: false };
  const stars = levelStars(pct);
  const passed = pct >= PASS_PCT;
  const firstPass = passed && !lv.done;
  const updated: CourseLevel = { ...lv, done: lv.done || passed, stars: Math.max(lv.stars, stars), best: Math.max(lv.best, pct) };
  return { course: { ...c, levels: c.levels.map((x, k) => (k === i ? updated : x)) }, passed, stars, firstPass };
}

export function courseProgress(c: Course): number {
  if (c.levels.length === 0) return 0;
  return Math.round((100 * c.levels.filter((l) => l.done).length) / c.levels.length);
}

export function totalStars(c: Course): number {
  return c.levels.reduce((s, l) => s + l.stars, 0);
}

export function newLevel(title: string, goal: string): CourseLevel {
  return { title, goal, done: false, stars: 0, best: 0, cardsAdded: false };
}
