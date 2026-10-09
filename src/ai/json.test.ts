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

import { pruneInvalid, repairJson } from './json';
import { z } from 'zod';

describe('repairJson y pruneInvalid', () => {
  const Step = z.object({ type: z.enum(['explica', 'elige', 'vf']), text: z.string(), options: z.array(z.string()), answer: z.number().int() });
  const Lesson = z.object({ steps: z.array(Step), score: z.number().int().min(0).max(10) });
  const schema = z.toJSONSchema(Lesson);

  it('rellena campos que faltan y convierte tipos', () => {
    const raw = { steps: [{ type: 'Explica', text: 'Hola' }, { type: 'vf', text: 'X', answer: true, options: 'a' }, { type: 'elige', text: 'P', options: ['a', 'b'], answer: '1' }], score: '12' };
    const fixed = repairJson(raw, schema);
    const ok = Lesson.safeParse(fixed);
    expect(ok.success).toBe(true);
    expect(ok.data!.steps[0]).toEqual({ type: 'explica', text: 'Hola', options: [], answer: -1 });
    expect(ok.data!.steps[1].answer).toBe(1);
    expect(ok.data!.steps[2].answer).toBe(1);
    expect(ok.data!.score).toBe(10);
  });

  it('quita solo los elementos inválidos de una lista', () => {
    const data = repairJson({ steps: [{ type: 'explica', text: 'a' }, { type: 'baile', text: 'b' }, { type: 'vf', text: 'c', answer: 0 }], score: 5 }, schema);
    const first = Lesson.safeParse(data);
    expect(first.success).toBe(false);
    expect(pruneInvalid(data, first.error!.issues.map((i) => i.path))).toBe(true);
    const second = Lesson.safeParse(data);
    expect(second.success).toBe(true);
    expect(second.data!.steps.map((s) => s.type)).toEqual(['explica', 'vf']);
  });
});
