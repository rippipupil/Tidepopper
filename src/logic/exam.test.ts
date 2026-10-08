import { describe, expect, it } from 'vitest';
import { buildQuickExam, daysUntil, examReward, examScore, formatScore, gradeLabel, gradeObjective } from './exam';

const cards = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'].map((x) => ({ id: x, front: `F${x}`, back: `B${x}` }));

describe('examen rápido', () => {
  it('mezcla tipo test y verdadero/falso con respuestas coherentes', () => {
    const q = buildQuickExam(cards, 10);
    expect(q).toHaveLength(10);
    expect(q.filter((x) => x.kind === 'choice')).toHaveLength(7);
    for (const x of q) {
      if (x.kind === 'choice') expect(x.options[x.answer]).toBe(`B${/«F(\w)»/.exec(x.prompt)![1]}`);
      if (x.kind === 'truefalse') expect(x.answer).toBe(x.statement === `B${x.prompt.slice(1)}`);
    }
  });
  it('sin 4 tarjetas no hay examen', () => {
    expect(buildQuickExam(cards.slice(0, 3))).toEqual([]);
  });
});

describe('nota', () => {
  it('corrige las objetivas', () => {
    expect(gradeObjective({ kind: 'choice', prompt: '', options: ['a', 'b'], answer: 1 }, 1)).toBe(1);
    expect(gradeObjective({ kind: 'truefalse', prompt: '', statement: '', answer: false }, true)).toBe(0);
    expect(gradeObjective({ kind: 'choice', prompt: '', options: [], answer: 0 }, null)).toBe(0);
  });
  it('calcula la nota sobre 10 con un decimal', () => {
    expect(examScore([1, 1, 0, 0.5])).toBe(6.3);
    expect(examScore([1, 1, 1])).toBe(10);
    expect(examScore([])).toBe(0);
  });
  it('etiqueta y formato en español', () => {
    expect(gradeLabel(4.9)).toBe('Suspenso');
    expect(gradeLabel(5)).toBe('Aprobado');
    expect(gradeLabel(8.5)).toBe('Notable');
    expect(gradeLabel(9)).toBe('Sobresaliente');
    expect(formatScore(7.5)).toBe('7,5');
    expect(formatScore(8)).toBe('8');
  });
  it('aprobar paga mucho más que suspender', () => {
    expect(examReward(8, 1).coins).toBe(200);
    expect(examReward(4, 1).coins).toBe(20);
    expect(examReward(9.5, 1).gems).toBe(1);
  });
  it('cuenta los días hasta el examen', () => {
    const now = new Date(2026, 9, 8, 18).getTime();
    expect(daysUntil('2026-10-08', now)).toBe(0);
    expect(daysUntil('2026-10-17', now)).toBe(9);
    expect(daysUntil('2026-10-01', now)).toBe(-7);
  });
});
