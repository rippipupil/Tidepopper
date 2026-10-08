import { describe, expect, it } from 'vitest';
import { normalizeMask, similarity } from './drawing';
import { ALPHABETS, guessAlphabet } from './alphabets';

function canvas(w: number, h: number, paint: (x: number, y: number) => boolean): Uint8Array {
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = paint(x, y) ? 1 : 0;
  return m;
}
// Una "T": barra arriba y palo en medio.
const T = (s: number, ox: number, oy: number) => (x: number, y: number) => (y - oy >= 0 && y - oy < s / 8 && x - ox >= 0 && x - ox < s) || (x - ox >= s * 0.45 && x - ox < s * 0.55 && y - oy >= 0 && y - oy < s);
const L = (s: number) => (x: number, y: number) => (x < s / 8 && y < s) || (y >= s * 0.87 && y < s && x < s);

describe('corrector de dibujo', () => {
  it('la misma letra a otro tamaño y en otro sitio puntúa alto', () => {
    const target = normalizeMask(canvas(100, 100, T(100, 0, 0)), 100, 100);
    const user = normalizeMask(canvas(200, 200, T(60, 90, 30)), 200, 200);
    expect(similarity(user, target)).toBeGreaterThanOrEqual(85);
  });
  it('otra letra puntúa bajo', () => {
    const target = normalizeMask(canvas(100, 100, T(100, 0, 0)), 100, 100);
    const user = normalizeMask(canvas(100, 100, L(100)), 100, 100);
    expect(similarity(user, target)).toBeLessThan(60);
  });
  it('un punto suelto lejos de la letra no la estropea', () => {
    const target = normalizeMask(canvas(100, 100, T(100, 0, 0)), 100, 100);
    const withDot = canvas(300, 300, (x, y) => T(150, 120, 120)(x, y) || (x < 3 && y < 3));
    expect(similarity(normalizeMask(withDot, 300, 300), target)).toBeGreaterThanOrEqual(85);
  });
  it('sin dibujo, 0', () => {
    const target = normalizeMask(canvas(10, 10, () => true), 10, 10);
    expect(similarity(new Uint8Array(32 * 32), target)).toBe(0);
  });
});

describe('alfabetos', () => {
  it('tienen letras y lectura', () => {
    expect(ALPHABETS.find((a) => a.id === 'hiragana')!.glyphs).toHaveLength(46);
    expect(ALPHABETS.find((a) => a.id === 'cirilico')!.glyphs).toHaveLength(33);
    expect(ALPHABETS.find((a) => a.id === 'griego')!.glyphs[0]).toEqual({ char: 'Α', sound: 'alfa' });
  });
  it('reconoce el alfabeto por el tema', () => {
    expect(guessAlphabet('Japonés para viajar')!.id).toBe('hiragana');
    expect(guessAlphabet('Ruso básico')!.id).toBe('cirilico');
    expect(guessAlphabet('Historia de Roma')).toBeUndefined();
  });
});
