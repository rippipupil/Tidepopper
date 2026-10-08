import { describe, expect, it } from 'vitest';
import { anagramCards, buildMixed, buildPairs, buildTrueFalse, checkWritten, normalize, scramble } from './games';

const cards = ['Mitocondria', 'Ribosoma', 'Núcleo', 'Cloroplasto', 'Lisosoma', 'Aparato de Golgi'].map((f, k) => ({ id: `c${k}`, front: f, back: `Def ${k}` }));
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe('escribir', () => {
  it('ignora tildes, mayúsculas y signos', () => {
    expect(normalize('  ¡Núcleo! ')).toBe('nucleo');
    expect(checkWritten('nucleo', 'Núcleo')).toBe('exact');
  });
  it('perdona una errata pequeña pero no otra palabra', () => {
    expect(checkWritten('mitocondira', 'Mitocondria')).toBe('close');
    expect(checkWritten('ribosoma', 'Mitocondria')).toBe('wrong');
    expect(checkWritten('', 'Mitocondria')).toBe('wrong');
  });
});

describe('parejas', () => {
  it('cada tarjeta da dos fichas que comparten pareja', () => {
    const t = buildPairs(cards, 4, rnd);
    expect(t).toHaveLength(8);
    for (const x of t) expect(t.filter((y) => y.pair === x.pair)).toHaveLength(2);
  });
  it('con menos de 3 tarjetas no hay juego', () => {
    expect(buildPairs(cards.slice(0, 2))).toEqual([]);
  });
});

describe('verdadero o falso', () => {
  it('lo que se enseña es verdad solo si es la definición de esa tarjeta', () => {
    for (const it of buildTrueFalse(cards, 40, rnd)) {
      const real = cards.find((c) => c.front === it.front)!.back;
      expect(it.truth).toBe(it.shown === real);
    }
  });
});

describe('ordenar letras', () => {
  it('desordena sin perder letras', () => {
    const s = scramble('ribosoma', rnd);
    expect(s.join('')).not.toBe('ribosoma');
    expect([...s].sort().join('')).toBe([...'ribosoma'].sort().join(''));
  });
  it('solo usa términos cortos', () => {
    expect(anagramCards([{ id: 'x', front: 'Una frase demasiado larga para ordenar', back: 'y' }])).toEqual([]);
  });
});

describe('modo mixto', () => {
  it('mezcla tipos sin repetir el mismo dos veces seguidas', () => {
    const r = buildMixed(cards, 30, rnd);
    expect(r).toHaveLength(30);
    expect(new Set(r.map((x) => x.kind)).size).toBe(4);
    for (let k = 1; k < r.length; k++) expect(r[k].kind).not.toBe(r[k - 1].kind);
    for (const x of r) if (x.kind === 'choice') expect(x.options).toContain(cards.find((c) => c.front === x.prompt)!.back);
  });
});
