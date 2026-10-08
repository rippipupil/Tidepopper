import type { Progress, StatKey } from '../data/types';

export const STAT_KEYS: StatKey[] = ['reviews', 'games', 'mixed', 'letters', 'levels', 'exams', 'examsPassed', 'attacks', 'built', 'removed'];
const zero = () => Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Record<StatKey, number>;

export function emptyProgress(): Progress {
  return { totals: zero(), day: '', today: zero(), bestExam: 0, missionsClaimed: [], achievements: [] };
}

/** Al cambiar de día se reinician los contadores de hoy y las misiones. */
export function rollDay(p: Progress, today: string): Progress {
  return p.day === today ? p : { ...p, day: today, today: zero(), missionsClaimed: [] };
}

export function bump(p: Progress, today: string, key: StatKey, n = 1): Progress {
  const q = rollDay(p, today);
  return { ...q, totals: { ...q.totals, [key]: q.totals[key] + n }, today: { ...q.today, [key]: q.today[key] + n } };
}

// ---------- Misiones diarias ----------
export interface Mission {
  id: string;
  text: string;
  key: StatKey;
  goal: number;
  coins: number;
}

export const MISSION_POOL: Mission[] = [
  { id: 'rep20', text: 'Repasa 20 tarjetas', key: 'reviews', goal: 20, coins: 60 },
  { id: 'rep40', text: 'Repasa 40 tarjetas', key: 'reviews', goal: 40, coins: 100 },
  { id: 'jue2', text: 'Juega 2 minijuegos', key: 'games', goal: 2, coins: 50 },
  { id: 'mix1', text: 'Termina una partida del modo mixto', key: 'mixed', goal: 1, coins: 60 },
  { id: 'let10', text: 'Dibuja 10 letras bien', key: 'letters', goal: 10, coins: 70 },
  { id: 'lvl1', text: 'Aprueba un nivel de un curso', key: 'levels', goal: 1, coins: 80 },
  { id: 'exa1', text: 'Haz un examen', key: 'exams', goal: 1, coins: 80 },
  { id: 'atk1', text: 'Haz un ataque', key: 'attacks', goal: 1, coins: 40 },
];
export const ALL_MISSIONS_GEMS = 1;

function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Tres misiones por día, siempre las mismas para ese día; siempre hay una de repasar. */
export function dailyMissions(day: string): Mission[] {
  const others = MISSION_POOL.filter((m) => m.key !== 'reviews');
  const h = hash(day);
  const a = others[h % others.length];
  const rest = others.filter((m) => m.id !== a.id);
  const b = rest[(h >>> 8) % rest.length];
  const review = MISSION_POOL[(h >>> 16) % 2];
  return [review, a, b];
}

// ---------- Logros ----------
export interface Achievement {
  id: string;
  name: string;
  desc: string;
  gems: number;
  unlocks?: string; // decoración que desbloquea
  done: (p: Progress, extra: { streak: number; studies: number; courses: number; thLevel: number }) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'primer', name: 'Primer paso', desc: 'Crea tu primer estudio', gems: 1, done: (_, e) => e.studies >= 1 },
  { id: 'rep100', name: 'Cien repasos', desc: 'Repasa 100 tarjetas', gems: 2, unlocks: 'farol', done: (p) => p.totals.reviews >= 100 },
  { id: 'rep1000', name: 'Memoria de hierro', desc: 'Repasa 1.000 tarjetas', gems: 5, unlocks: 'estatua', done: (p) => p.totals.reviews >= 1000 },
  { id: 'racha7', name: 'Una semana', desc: 'Estudia 7 días seguidos', gems: 3, unlocks: 'bandera', done: (_, e) => e.streak >= 7 },
  { id: 'racha30', name: 'Imparable', desc: 'Estudia 30 días seguidos', gems: 8, unlocks: 'fuente', done: (_, e) => e.streak >= 30 },
  { id: 'sobre', name: 'Sobresaliente', desc: 'Saca un 9 o más en un examen', gems: 3, unlocks: 'flores', done: (p) => p.bestExam >= 9 },
  { id: 'curso', name: 'Alumno del asistente', desc: 'Aprueba 5 niveles de cursos', gems: 3, done: (p) => p.totals.levels >= 5 },
  { id: 'letras', name: 'Buena letra', desc: 'Dibuja 50 letras bien', gems: 3, done: (p) => p.totals.letters >= 50 },
  { id: 'mixto', name: 'Todoterreno', desc: 'Termina 10 partidas del modo mixto', gems: 3, done: (p) => p.totals.mixed >= 10 },
  { id: 'guerrero', name: 'Conquistador', desc: 'Haz 10 ataques', gems: 3, done: (p) => p.totals.attacks >= 10 },
  { id: 'th3', name: 'Ciudad', desc: 'Sube el ayuntamiento a nivel 3', gems: 4, done: (_, e) => e.thLevel >= 3 },
  { id: 'limpio', name: 'Jardinero', desc: 'Quita 5 árboles o rocas', gems: 2, done: (p) => p.totals.removed >= 5 },
];
