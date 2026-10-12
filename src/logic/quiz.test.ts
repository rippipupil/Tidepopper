import { describe, expect, it } from 'vitest';
import { buildQuiz, quizFromCards } from './quiz';

const cards = ['a', 'b', 'c', 'd', 'e'].map((x) => ({ id: x, front: `F${x}`, back: `B${x}` }));

describe('quiz', () => {
  it('necesita al menos 4 respuestas distintas', () => {
    expect(buildQuiz(cards.slice(0, 3), 5)).toEqual([]);
  });
  it('cada pregunta tiene 4 opciones únicas y la correcta bien marcada', () => {
    const q = buildQuiz(cards, 5);
    expect(q).toHaveLength(5);
    for (const item of q) {
      expect(new Set(item.options).size).toBe(4);
      expect(item.options[item.answer]).toBe(`B${item.prompt.slice(1)}`);
    }
  });
});


describe('quizFromCards', () => {
  it('mezcla tipo test, verdadero o falso y escribir, todos con solución válida', () => {
    const many = 'abcdefghij'.split('').map((x) => ({ id: x, front: `T${x}`, back: `Definición ${x}` }));
    const q = quizFromCards(many, 10);
    expect(q).toHaveLength(10);
    expect(new Set(q.map((s) => s.type))).toEqual(new Set(['elige', 'vf', 'escribe']));
    for (const s of q) {
      if (s.type === 'elige') expect(s.options[s.answer]).toBeTruthy();
      if (s.type === 'vf') expect([0, 1]).toContain(s.answer);
      if (s.type === 'escribe') expect(s.accepted[0]).toMatch(/^T/);
    }
  });
});
