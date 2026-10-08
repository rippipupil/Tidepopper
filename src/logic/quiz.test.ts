import { describe, expect, it } from 'vitest';
import { buildQuiz } from './quiz';

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
