import { describe, expect, it } from 'vitest';
import { extractJson } from './json';

describe('extractJson', () => {
  it('lee JSON limpio', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('lee JSON dentro de un bloque de código con texto alrededor', () => {
    expect(extractJson('Aquí tienes:\n```json\n{"cards":[{"front":"x","back":"y"}]}\n```\n¡Suerte!')).toEqual({ cards: [{ front: 'x', back: 'y' }] });
  });

  it('lee JSON con texto delante y detrás sin bloque', () => {
    expect(extractJson('Claro. {"score": 7} Espero que ayude.')).toEqual({ score: 7 });
  });

  it('falla si no hay JSON', () => {
    expect(() => extractJson('no sé')).toThrow();
  });
});
