import type { Streak, Village, Wallet } from '../data/types';

export const MAX_ATTACKS_PER_DAY = 2;
export const CORRECT_PER_TROOP = 10;
export const MAX_TROOPS = 20;

export function dayKey(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1, 12).getTime());
}

/** Racha: sube si ayer también estudiaste, se queda igual si ya contaste hoy, si no vuelve a 1. */
export function touchStreak(s: Streak, today: string): Streak {
  if (s.lastDay === today) return s;
  return { lastDay: today, days: s.lastDay === previousDay(today) ? s.days + 1 : 1 };
}

export function streakMultiplier(days: number): number {
  return days >= 7 ? 1.5 : days >= 3 ? 1.2 : 1;
}

export interface SessionResult {
  correct: number;
  total: number;
}

export interface Reward {
  coins: number;
  xp: number;
  gems: number;
  stars: number;
}

export function stars(correct: number, total: number): number {
  if (total === 0) return 0;
  const r = correct / total;
  return r >= 0.95 ? 3 : r >= 0.75 ? 2 : r >= 0.5 ? 1 : 0;
}

/** Solo pagan los aciertos y las sesiones terminadas. La racha multiplica las monedas. */
export function sessionReward(r: SessionResult, streakDays: number): Reward {
  const coins = Math.round(r.correct * 10 * streakMultiplier(streakDays));
  const xp = r.total > 0 ? 20 + r.correct * 5 : 0;
  const perfect = r.total >= 10 && r.correct === r.total;
  const weekly = streakDays > 0 && streakDays % 7 === 0;
  return { coins, xp, gems: (perfect ? 1 : 0) + (weekly ? 1 : 0), stars: stars(r.correct, r.total) };
}

export function applyReward(w: Wallet, r: Reward): Wallet {
  return { coins: w.coins + r.coins, xp: w.xp + r.xp, gems: w.gems + r.gems };
}

/** XP total necesaria para llegar al nivel n (nivel 1 = 0). */
export function xpForLevel(n: number): number {
  return 50 * n * (n - 1);
}

export function levelInfo(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return { level, into: xp - xpForLevel(level), need: xpForLevel(level + 1) - xpForLevel(level) };
}

/** Las tropas se entrenan estudiando: cada 10 aciertos, una tropa. */
export function trainTroops(v: Village, correct: number): Village {
  const total = v.correctSinceTroop + correct;
  const troops = Math.min(MAX_TROOPS, v.troops + Math.floor(total / CORRECT_PER_TROOP));
  return { ...v, troops, correctSinceTroop: total % CORRECT_PER_TROOP };
}

export function attacksLeft(v: Village, today: string): number {
  return v.attacksDay === today ? Math.max(0, MAX_ATTACKS_PER_DAY - v.attacksUsed) : MAX_ATTACKS_PER_DAY;
}

/** Registra un ataque. Devuelve null si ya no quedan ataques hoy o no hay tropas. */
export function startAttack(v: Village, today: string): Village | null {
  if (attacksLeft(v, today) === 0 || v.troops === 0) return null;
  const used = v.attacksDay === today ? v.attacksUsed + 1 : 1;
  return { ...v, attacksDay: today, attacksUsed: used };
}

/** Botín de un ataque según el % destruido. */
export function attackLoot(destroyedPct: number): number {
  return Math.round(Math.max(0, Math.min(100, destroyedPct)) * 4);
}
