// Señuelos que se parecen a la respuesta correcta: mismo tipo, formato y tema,
// para que las preguntas hagan pensar y no se acierten por descarte.
import { normalize } from './games';

const STOP = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'y', 'o', 'a', 'en', 'que', 'es', 'se', 'por', 'con', 'para', 'al', 'su', 'lo']);
const ARTICLES = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas']);

const words = (s: string) => normalize(s).split(' ').filter(Boolean);
const content = (s: string) => new Set(words(s).filter((w) => !STOP.has(w) && w.length > 1));
const hasDigit = (s: string) => /\d/.test(s);
const hasSymbol = (s: string) => /[^\p{L}\p{N}\s.,;:¿?¡!()'"«»-]/u.test(s);

/** Parecido de forma y tema entre dos respuestas (0 = nada que ver). */
export function similarity(a: string, b: string): number {
  const la = [...a.trim()].length;
  const lb = [...b.trim()].length;
  if (!la || !lb) return 0;
  const wa = words(a);
  const wb = words(b);
  let score = 2 * (Math.min(la, lb) / Math.max(la, lb));
  if (wa.length === wb.length) score += 1;
  else if (Math.abs(wa.length - wb.length) === 1) score += 0.4;
  if (wa[0] && wa[0] === wb[0] && ARTICLES.has(wa[0])) score += 1.5;
  if (hasDigit(a) === hasDigit(b)) score += hasDigit(a) ? 1.5 : 0.3;
  if (hasSymbol(a) === hasSymbol(b)) score += hasSymbol(a) ? 1.5 : 0.2;
  if (/\.$/.test(a.trim()) === /\.$/.test(b.trim())) score += 0.4;
  const ca = content(a);
  const cb = content(b);
  const shared = [...ca].filter((w) => cb.has(w)).length;
  const union = new Set([...ca, ...cb]).size;
  if (union) score += 2.5 * (shared / union);
  return score;
}

function shuffle<T>(xs: T[], rnd: () => number): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Elige n respuestas incorrectas para «correct»: primero las que la IA escribió
 * para esa tarjeta («wrong») y después las respuestas de otras tarjetas que más se le parecen.
 */
export function pickDistractors(correct: string, wrong: string[] | undefined, pool: string[], n = 3, rnd: () => number = Math.random): string[] {
  const key = normalize(correct);
  const seen = new Set([key]);
  const out: string[] = [];
  const take = (x: string) => {
    const k = normalize(x);
    if (!k || seen.has(k) || out.length >= n) return;
    seen.add(k);
    out.push(x.trim());
  };
  for (const w of shuffle(wrong ?? [], rnd)) take(w);
  if (out.length < n) {
    const ranked = pool
      .filter((x) => !seen.has(normalize(x)))
      // Un poco de azar para que no salgan siempre los mismos señuelos.
      .map((x) => ({ x, s: similarity(correct, x) + rnd() * 0.8 }))
      .sort((p, q) => q.s - p.s);
    for (const r of ranked) take(r.x);
  }
  return out;
}

/** Una respuesta incorrecta creíble (para verdadero o falso). */
export function pickWrong(correct: string, wrong: string[] | undefined, pool: string[], rnd: () => number = Math.random): string | null {
  return pickDistractors(correct, wrong, pool, 1, rnd)[0] ?? null;
}
