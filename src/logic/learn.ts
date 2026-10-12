// Estado de aprendizaje de las tarjetas (como el «Learn mode» de Turbo):
// nuevas, aprendiendo y dominadas, según la repetición espaciada.
import type { Card } from '../data/types';

export type CardStatus = 'new' | 'learning' | 'mastered';

/** Dominada cuando ya vuelve en una semana o más. */
export const MASTERED_DAYS = 7;

export function cardStatus(c: Card): CardStatus {
  if (c.sched.reps === 0 && c.sched.lapses === 0 && c.sched.interval === 0) return 'new';
  return c.sched.interval >= MASTERED_DAYS ? 'mastered' : 'learning';
}

export function statusCounts(cards: Card[]): Record<CardStatus, number> {
  const out: Record<CardStatus, number> = { new: 0, learning: 0, mastered: 0 };
  for (const c of cards) out[cardStatus(c)]++;
  return out;
}

/** Dominio de un conjunto de tarjetas (0–100): las dominadas cuentan entero y las que aprendes, medio. */
export function memoryOf(cards: Card[]): number {
  if (!cards.length) return 0;
  const n = statusCounts(cards);
  return Math.round((100 * (n.mastered + 0.5 * n.learning)) / cards.length);
}

/** Tarjetas ya estudiadas cuyo repaso ha vencido. */
export function dueCards(cards: Card[], now: number): Card[] {
  return cards.filter((c) => cardStatus(c) !== 'new' && c.sched.due <= now).sort((a, b) => a.sched.due - b.sched.due);
}

export function dueCount(cards: Card[], now: number): number {
  return dueCards(cards, now).length;
}

/** Sesión de estudio: primero las vencidas, luego nuevas, hasta «limit». */
export function studyQueue(cards: Card[], now: number, limit = 20): Card[] {
  const fresh = cards.filter((c) => cardStatus(c) === 'new').sort((a, b) => a.createdAt - b.createdAt);
  return [...dueCards(cards, now), ...fresh].slice(0, limit);
}
