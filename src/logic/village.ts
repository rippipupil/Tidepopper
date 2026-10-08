import meta from './iso-meta.json';
import type { Placed, Village } from '../data/types';

export const GRID = 16;
/** Punto de la pantalla (px, escala 1) donde cae la esquina superior de la casilla (0,0). */
export const ORIGIN = { x: 193, y: 35 };

type SpriteMeta = { w: number; h: number; ox: number; oy: number; n: number };
const M = meta as Record<string, SpriteMeta>;

export interface BuildingType {
  type: string;
  name: string;
  cost: number;
  max: number;
  defense: boolean;
  shop: boolean;
  desc: string;
  minTH?: number; // nivel de ayuntamiento necesario
  unlock?: string; // logro necesario
  decor?: boolean;
}

export const CATALOG: Record<string, BuildingType> = {
  ayuntamiento: { type: 'ayuntamiento', name: 'Ayuntamiento', cost: 0, max: 1, defense: false, shop: false, desc: 'El corazón de la aldea. Su nivel marca hasta dónde puedes mejorar lo demás.' },
  canon: { type: 'canon', name: 'Cañón', cost: 250, max: 2, defense: true, shop: true, desc: 'Daño fuerte de cerca. Su fuerza es lo que recuerdas del estudio que lo alimenta.' },
  arqueras: { type: 'arqueras', name: 'Torre de arqueras', cost: 350, max: 2, defense: true, shop: true, desc: 'Dispara a cualquier enemigo que se acerque, por tierra o por aire.' },
  catapulta: { type: 'catapulta', name: 'Catapulta', cost: 450, max: 1, defense: true, shop: true, desc: 'Lanza rocas a grupos de enemigos. No alcanza a los que están demasiado cerca.' },
  ballesta: { type: 'ballesta', name: 'Ballesta', cost: 600, max: 1, defense: true, shop: true, desc: 'Mucho alcance y disparo rápido. Aliméntala con tu estudio más importante.' },
  muro: { type: 'muro', name: 'Muro', cost: 20, max: 40, defense: false, shop: true, desc: 'Frena a los enemigos para que tus defensas tengan tiempo de disparar.' },
  mina: { type: 'mina', name: 'Mina', cost: 150, max: 2, defense: false, shop: true, desc: 'Produce monedas cada hora, pero solo los días que estudias.' },
  almacen: { type: 'almacen', name: 'Almacén', cost: 200, max: 2, defense: false, shop: true, desc: 'Guarda tus monedas. La Niebla intenta robarlas si tus defensas fallan.' },
  cuartel: { type: 'cuartel', name: 'Cuartel', cost: 300, max: 1, defense: false, shop: true, desc: 'Aquí esperan tus tropas. Se entrenan estudiando: 10 aciertos, una tropa.' },
  laboratorio: { type: 'laboratorio', name: 'Laboratorio', cost: 800, max: 1, defense: false, shop: true, desc: 'Usa cristales para mejorar tropas y defensas.' },
  cabana: { type: 'cabana', name: 'Cabaña', cost: 500, max: 2, defense: false, shop: true, desc: 'Aquí vive un constructor. Cada cabaña es una obra a la vez.' },
  torre_magica: { type: 'torre_magica', name: 'Torre mágica', cost: 900, max: 1, defense: true, shop: true, minTH: 2, desc: 'Lanza rayos de cristal que dañan a varios enemigos a la vez. Necesita el ayuntamiento a nivel 2.' },
  arbol: { type: 'arbol', name: 'Árbol', cost: 10, max: 12, defense: false, shop: true, decor: true, desc: 'Decoración. Al quitarlo a veces aparece un cristal.' },
  flores: { type: 'flores', name: 'Flores', cost: 15, max: 20, defense: false, shop: true, decor: true, unlock: 'sobre', desc: 'Decoración. Logro «Sobresaliente».' },
  farol: { type: 'farol', name: 'Farol', cost: 30, max: 12, defense: false, shop: true, decor: true, unlock: 'rep100', desc: 'Decoración. Logro «Cien repasos».' },
  bandera: { type: 'bandera', name: 'Bandera', cost: 40, max: 6, defense: false, shop: true, decor: true, unlock: 'racha7', desc: 'Decoración. Logro «Una semana».' },
  estatua: { type: 'estatua', name: 'Estatua del saber', cost: 200, max: 1, defense: false, shop: true, decor: true, unlock: 'rep1000', desc: 'Decoración. Logro «Memoria de hierro».' },
  fuente: { type: 'fuente', name: 'Fuente', cost: 250, max: 1, defense: false, shop: true, decor: true, unlock: 'racha30', desc: 'Decoración. Logro «Imparable».' },
  roca: { type: 'roca', name: 'Roca', cost: 0, max: 12, defense: false, shop: false, desc: 'Decoración.' },
};

export function size(type: string): number {
  return M[type].n;
}

export function sprite(type: string): SpriteMeta & { src: string } {
  return { ...M[type], src: `img/iso/v-${type}.png` };
}

/** Sprite según el nivel: los niveles 3–4 y 5 tienen su propio aspecto. */
export function spriteFor(type: string, level: number): SpriteMeta & { src: string } {
  const tier = level >= 5 ? 3 : level >= 3 ? 2 : 1;
  const key = tier > 1 && M[`${type}@${tier}`] ? `${type}@${tier}` : type;
  return { ...M[key], src: `img/iso/v-${key.replace('@', '-t')}.png` };
}

/** Proyección isométrica: casilla (i, j) → punto de pantalla de su esquina superior. */
export function project(i: number, j: number): { x: number; y: number } {
  return { x: ORIGIN.x + (i - j) * 12, y: ORIGIN.y + (i + j) * 6 };
}

export function overlaps(a: { i: number; j: number; n: number }, b: { i: number; j: number; n: number }): boolean {
  return a.i < b.i + b.n && b.i < a.i + a.n && a.j < b.j + b.n && b.j < a.j + a.n;
}

export function isFree(buildings: Placed[], type: string, i: number, j: number, ignoreId?: string): boolean {
  const n = size(type);
  if (i < 0 || j < 0 || i + n > GRID || j + n > GRID) return false;
  return buildings.every((b) => b.id === ignoreId || !overlaps({ i, j, n }, { i: b.i, j: b.j, n: size(b.type) }));
}

/** Casilla libre más cercana al centro para un edificio nuevo. */
export function findSpot(buildings: Placed[], type: string): { i: number; j: number } | null {
  let best: { i: number; j: number } | null = null;
  let bestD = Infinity;
  for (let i = 0; i < GRID; i++)
    for (let j = 0; j < GRID; j++) {
      if (!isFree(buildings, type, i, j)) continue;
      const d = Math.abs(i - 7) + Math.abs(j - 7);
      if (d < bestD) {
        bestD = d;
        best = { i, j };
      }
    }
  return best;
}

export function count(buildings: Placed[], type: string): number {
  return buildings.filter((b) => b.type === type).length;
}

export type BuildError = 'max' | 'coins' | 'blocked' | 'locked';

export function canBuild(buildings: Placed[], coins: number, type: string, i: number, j: number, achievements: string[] = []): BuildError | null {
  const t = CATALOG[type];
  const th = buildings.find((b) => b.type === 'ayuntamiento')?.level ?? 1;
  if ((t.minTH && th < t.minTH) || (t.unlock && !achievements.includes(t.unlock))) return 'locked';
  if (count(buildings, type) >= t.max) return 'max';
  if (coins < t.cost) return 'coins';
  if (!isFree(buildings, type, i, j)) return 'blocked';
  return null;
}

/** Orden de dibujo: primero lo de atrás. */
export function drawOrder(buildings: Placed[]): Placed[] {
  return buildings.slice().sort((a, b) => a.i + a.j + size(a.type) - (b.i + b.j + size(b.type)));
}

export function startingVillage(): Village {
  const b: Placed[] = [
    { id: 'th', type: 'ayuntamiento', i: 6, j: 6, level: 1 },
    { id: 'c1', type: 'cabana', i: 12, j: 2, level: 1 },
    { id: 'd1', type: 'arbol', i: 0, j: 0, level: 1 },
    { id: 'd2', type: 'arbol', i: 15, j: 1, level: 1 },
    { id: 'd3', type: 'roca', i: 1, j: 14, level: 1 },
    { id: 'd4', type: 'arbol', i: 14, j: 15, level: 1 },
    { id: 'd5', type: 'roca', i: 3, j: 4, level: 1 },
  ];
  return { buildings: b, attacksDay: '', attacksUsed: 0, troops: 0, correctSinceTroop: 0, labLevel: 1, lastRaidDay: '', raid: null };
}
