import type { Card, Grade, Schedule } from '../data/types';

const MIN = 60_000;
const DAY = 86_400_000;
const MIN_EASE = 1.3;

export function newSchedule(now: number): Schedule {
  return { due: now, interval: 0, ease: 2.3, reps: 0, lapses: 0 };
}

/** Calcula la siguiente programación según cómo de bien la recordabas. */
export function review(s: Schedule, grade: Grade, now: number): Schedule {
  if (grade === 'again') {
    return { due: now + MIN, interval: 0, ease: Math.max(MIN_EASE, s.ease - 0.2), reps: 0, lapses: s.lapses + 1 };
  }
  if (grade === 'hard') {
    const interval = s.reps === 0 ? 0 : Math.max(1, Math.round(s.interval * 1.2));
    const due = interval === 0 ? now + 10 * MIN : now + interval * DAY;
    return { due, interval, ease: Math.max(MIN_EASE, s.ease - 0.15), reps: s.reps === 0 ? 0 : s.reps + 1, lapses: s.lapses };
  }
  const interval = s.reps === 0 ? 1 : s.reps === 1 ? 3 : Math.max(s.interval + 1, Math.round(s.interval * s.ease));
  return { due: now + interval * DAY, interval, ease: s.ease, reps: s.reps + 1, lapses: s.lapses };
}

export function isDue(card: Card, now: number): boolean {
  return card.sched.due <= now;
}

/** Tarjetas que ya se estudiaron y cuyo repaso está vencido: las "grietas". */
export function overdue(cards: Card[], now: number): Card[] {
  return cards.filter((c) => c.sched.reps > 0 && c.sched.due <= now);
}

/**
 * Lo que recuerdas de un estudio (0–100): proporción de tarjetas aprendidas y al día.
 * null si el estudio aún no tiene tarjetas.
 */
export function memory(cards: Card[], now: number): number | null {
  if (cards.length === 0) return null;
  const healthy = cards.filter((c) => c.sched.reps > 0 && c.sched.due > now).length;
  return Math.round((100 * healthy) / cards.length);
}

/** Cola de una sesión: primero las vencidas más antiguas, luego nuevas, hasta `limit`. */
export function sessionQueue(cards: Card[], now: number, limit = 20): Card[] {
  const due = cards.filter((c) => c.sched.reps > 0 && c.sched.due <= now).sort((a, b) => a.sched.due - b.sched.due);
  const fresh = cards.filter((c) => c.sched.reps === 0 && c.sched.due <= now).sort((a, b) => a.createdAt - b.createdAt);
  return [...due, ...fresh].slice(0, limit);
}
