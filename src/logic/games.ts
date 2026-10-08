// Minijuegos: generadores puros a partir de las tarjetas de un estudio.

import { pickDistractors, pickWrong } from './distractors';

export type Card0 = { id: string; front: string; back: string; wrong?: string[] };

function shuffle<T>(xs: T[], rnd: () => number): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const uniqBy = (cards: Card0[]) => cards.filter((c, k, all) => all.findIndex((x) => x.back === c.back) === k && all.findIndex((x) => x.front === c.front) === k);

/** Quita tildes, signos y espacios de más: para comparar respuestas escritas. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Distancia de edición (con transposiciones). */
export function levenshtein(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      // Dos letras cambiadas de sitio cuentan como una sola errata.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

/** 'exact' (igual sin contar tildes), 'close' (una errata por cada 6 letras) o 'wrong'. */
export function checkWritten(answer: string, expected: string): 'exact' | 'close' | 'wrong' {
  const a = normalize(answer);
  const e = normalize(expected);
  if (!a) return 'wrong';
  if (a === e) return 'exact';
  return levenshtein(a, e) <= Math.max(1, Math.floor(e.length / 6)) ? 'close' : 'wrong';
}

// ---------- Parejas ----------
export interface PairTile {
  key: string;
  pair: string; // id de la tarjeta
  text: string;
  side: 'front' | 'back';
}

export function buildPairs(cards: Card0[], n = 6, rnd: () => number = Math.random): PairTile[] {
  const pool = shuffle(uniqBy(cards), rnd).slice(0, n);
  if (pool.length < 3) return [];
  return shuffle(
    pool.flatMap((c) => [
      { key: `${c.id}-f`, pair: c.id, text: c.front, side: 'front' as const },
      { key: `${c.id}-b`, pair: c.id, text: c.back, side: 'back' as const },
    ]),
    rnd,
  );
}

// ---------- Verdadero o falso ----------
export interface TFItem {
  front: string;
  shown: string;
  truth: boolean;
  correct: string;
}

export function buildTrueFalse(cards: Card0[], n = 30, rnd: () => number = Math.random): TFItem[] {
  const pool = uniqBy(cards);
  if (pool.length < 2) return [];
  const out: TFItem[] = [];
  for (let k = 0; k < n; k++) {
    const c = pool[Math.floor(rnd() * pool.length)];
    const truth = rnd() < 0.5;
    const other = pickWrong(c.back, c.wrong, pool.filter((x) => x.id !== c.id).map((x) => x.back), rnd) ?? c.back;
    out.push({ front: c.front, shown: truth ? c.back : other, truth: truth || other === c.back, correct: c.back });
  }
  return out;
}

// ---------- Ordena las letras ----------
export function scramble(word: string, rnd: () => number = Math.random): string[] {
  const letters = [...word.replace(/\s+/g, ' ')];
  if (new Set(letters).size < 2) return letters;
  let s = letters;
  for (let k = 0; k < 10 && s.join('') === letters.join(''); k++) s = shuffle(letters, rnd);
  return s;
}

/** Solo sirven términos cortos (2–14 letras) para ordenar. */
export function anagramCards(cards: Card0[]): Card0[] {
  return uniqBy(cards).filter((c) => {
    const len = [...c.front.trim()].length;
    return len >= 2 && len <= 14;
  });
}

// ---------- Modo mixto ----------
export type MixKind = 'choice' | 'truefalse' | 'write' | 'anagram';
export type MixRound =
  | { kind: 'choice'; prompt: string; options: string[]; answer: number }
  | { kind: 'truefalse'; prompt: string; shown: string; truth: boolean; correct: string }
  | { kind: 'write'; prompt: string; expected: string }
  | { kind: 'anagram'; prompt: string; letters: string[]; expected: string };

/** Rondas aleatorias de distintos juegos, sin repetir el mismo tipo dos veces seguidas. */
export function buildMixed(cards: Card0[], n = 10, rnd: () => number = Math.random): MixRound[] {
  const pool = uniqBy(cards);
  if (pool.length < 4) return [];
  const anagrams = anagramCards(pool);
  const rounds: MixRound[] = [];
  let last: MixKind | null = null;
  for (let k = 0; k < n; k++) {
    const kinds = (['choice', 'truefalse', 'write', 'anagram'] as MixKind[]).filter((x) => x !== last && (x !== 'anagram' || anagrams.length > 0));
    const kind = kinds[Math.floor(rnd() * kinds.length)];
    last = kind;
    if (kind === 'anagram') {
      const c = anagrams[Math.floor(rnd() * anagrams.length)];
      rounds.push({ kind, prompt: c.back, letters: scramble(c.front.trim(), rnd), expected: c.front.trim() });
      continue;
    }
    const c = pool[Math.floor(rnd() * pool.length)];
    if (kind === 'choice') {
      const options = shuffle([c.back, ...pickDistractors(c.back, c.wrong, pool.filter((x) => x.id !== c.id).map((x) => x.back), 3, rnd)], rnd);
      rounds.push({ kind, prompt: c.front, options, answer: options.indexOf(c.back) });
    } else if (kind === 'truefalse') {
      const truth = rnd() < 0.5;
      const other = pickWrong(c.back, c.wrong, pool.filter((x) => x.id !== c.id).map((x) => x.back), rnd) ?? c.back;
      rounds.push({ kind, prompt: c.front, shown: truth ? c.back : other, truth: truth || other === c.back, correct: c.back });
    } else rounds.push({ kind, prompt: c.back, expected: c.front });
  }
  return rounds;
}
