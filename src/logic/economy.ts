import type { Placed, RaidReport, Village } from '../data/types';
import { CATALOG, count } from './village';

const MIN = 60_000;
const HOUR = 3_600_000;
export const MAX_LEVEL = 5;
export const SESSION_SPEEDUP = 30 * MIN;

export function townHallLevel(b: Placed[]): number {
  return b.find((x) => x.type === 'ayuntamiento')?.level ?? 1;
}

/** El ayuntamiento llega a 5; los demás, como mucho, un nivel por encima del ayuntamiento. */
export function maxLevel(type: string, thLevel: number): number {
  if (type === 'ayuntamiento') return MAX_LEVEL;
  if (type === 'muro' || type === 'arbol' || type === 'roca') return type === 'muro' ? Math.min(MAX_LEVEL, thLevel + 1) : 1;
  return Math.min(MAX_LEVEL, thLevel + 1);
}

export function upgradeCost(type: string, level: number): number {
  const base = type === 'ayuntamiento' ? 500 : Math.max(60, CATALOG[type].cost);
  return Math.round(base * level * 1.5);
}

/** Minutos de obra para pasar de `level` a `level + 1`. */
export function upgradeMinutes(type: string, level: number): number {
  const table = [0, 10, 30, 60, 120, 240];
  const t = table[Math.min(level, 5)];
  return type === 'muro' ? Math.max(1, Math.round(t / 10)) : type === 'ayuntamiento' ? t * 2 : t;
}

export function builders(b: Placed[]): number {
  return Math.max(1, count(b, 'cabana'));
}

export function busyBuilders(b: Placed[], now: number): number {
  return b.filter((x) => (x.upgradeUntil ?? 0) > now).length;
}

export type UpgradeError = 'max' | 'coins' | 'builders' | 'busy';

export function canUpgrade(b: Placed[], coins: number, id: string, now: number): UpgradeError | null {
  const x = b.find((y) => y.id === id);
  if (!x) return 'max';
  if ((x.upgradeUntil ?? 0) > now) return 'busy';
  if (x.level >= maxLevel(x.type, townHallLevel(b))) return 'max';
  if (coins < upgradeCost(x.type, x.level)) return 'coins';
  if (busyBuilders(b, now) >= builders(b)) return 'builders';
  return null;
}

export function startUpgrade(v: Village, coins: number, id: string, now: number): { village: Village; cost: number } | null {
  if (canUpgrade(v.buildings, coins, id, now)) return null;
  const x = v.buildings.find((y) => y.id === id)!;
  const cost = upgradeCost(x.type, x.level);
  const until = now + upgradeMinutes(x.type, x.level) * MIN;
  return { cost, village: { ...v, buildings: v.buildings.map((y) => (y.id === id ? { ...y, upgradeUntil: until } : y)) } };
}

/** Termina las obras cuyo tiempo ya pasó. */
export function settleUpgrades(v: Village, now: number): Village {
  if (!v.buildings.some((x) => x.upgradeUntil && x.upgradeUntil <= now)) return v;
  return { ...v, buildings: v.buildings.map((x) => (x.upgradeUntil && x.upgradeUntil <= now ? { ...x, level: x.level + 1, upgradeUntil: undefined } : x)) };
}

/** Estudiar acelera todas las obras en marcha. */
export function speedUp(v: Village, ms: number): Village {
  if (!v.buildings.some((x) => x.upgradeUntil)) return v;
  return { ...v, buildings: v.buildings.map((x) => (x.upgradeUntil ? { ...x, upgradeUntil: x.upgradeUntil - ms } : x)) };
}

export function mineRate(level: number): number {
  return 15 * level; // monedas por hora
}

export function mineCap(level: number): number {
  return 120 * level;
}

export function mineAvailable(m: Placed, now: number): number {
  const since = m.collectedAt ?? now;
  return Math.min(mineCap(m.level), Math.floor(((now - since) / HOUR) * mineRate(m.level)));
}

/** La mina solo se puede vaciar los días que has estudiado. */
export function collectMine(v: Village, id: string, now: number, studiedToday: boolean): { village: Village; coins: number } {
  const m = v.buildings.find((x) => x.id === id);
  if (!m || m.type !== 'mina' || !studiedToday) return { village: v, coins: 0 };
  const coins = mineAvailable(m, now);
  if (coins === 0) return { village: v, coins: 0 };
  return { coins, village: { ...v, buildings: v.buildings.map((x) => (x.id === id ? { ...x, collectedAt: now } : x)) } };
}

/** Lo que roba la Niebla: más grietas y defensas más débiles = más robo. Los muros lo reducen. */
export function raidLoss(coins: number, cracks: number, defense: number, walls: number): number {
  if (cracks === 0 || coins <= 0) return 0;
  const base = cracks * 6 * (1 - defense / 100);
  const wallCut = Math.min(0.3, walls * 0.01);
  return Math.min(Math.round(coins * 0.25), Math.round(base * (1 - wallCut)));
}

/**
 * Se llama al abrir la app: si es un día nuevo y había grietas, la Niebla ataca
 * (una vez al día). El primer día no hay ataque.
 */
export function maybeRaid(v: Village, coins: number, today: string, cracks: number, defense: number): { village: Village; stolen: number } {
  if (v.lastRaidDay === today) return { village: v, stolen: 0 };
  if (!v.lastRaidDay || cracks === 0) return { village: { ...v, lastRaidDay: today }, stolen: 0 };
  const stolen = raidLoss(coins, cracks, defense, count(v.buildings, 'muro'));
  const raid: RaidReport = { day: today, cracks, defense, stolen, seen: false };
  return { stolen, village: { ...v, lastRaidDay: today, raid } };
}

export const LAB_COSTS = [0, 2, 4, 6, 8]; // cristales para pasar del nivel i+1 al i+2

export function labUpgradeCost(labLevel: number): number | null {
  return labLevel >= MAX_LEVEL ? null : LAB_COSTS[labLevel];
}

/** % de la fortaleza que destruye cada acierto en un ataque. */
export function hitPower(questions: number, labLevel: number): number {
  return (100 / Math.max(1, questions)) * (1 + 0.15 * (labLevel - 1));
}
