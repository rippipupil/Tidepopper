import { describe, expect, it } from 'vitest';
import type { LessonStep } from '../data/types';
import { checkOrder, checkWrite, cleanSteps, lessonText, quizOf, scrambledOrder, stepsOf } from './lesson';

const step = (s: Partial<LessonStep>): LessonStep => ({ type: 'explica', emoji: '', text: '', example: '', options: [], answer: -1, pairs: [], accepted: [], explanation: '', ...s });

describe('cleanSteps', () => {
  it('quita los ejercicios rotos y arregla los que se pueden', () => {
    const out = cleanSteps([
      step({ type: 'explica', text: 'Idea' }),
      step({ type: 'elige', text: '¿?', options: ['a', 'b'], answer: 5 }),
      step({ type: 'hueco', text: 'Sin hueco', options: ['a', 'b'], answer: 0 }),
      step({ type: 'vf', text: 'Cierto', answer: 1 }),
      step({ type: 'vf', text: 'Raro', answer: 2 }),
      step({ type: 'ordena', text: 'Ordena', options: ['1', '2'] }),
      step({ type: 'parejas', text: '', pairs: [{ a: 'E', b: '·' }, { a: 'T', b: '–' }, { a: 'A', b: '·–' }] }),
      step({ type: 'escribe', text: '¿?', accepted: [' '] }),
    ]);
    expect(out.map((s) => s.type)).toEqual(['explica', 'elige', 'vf', 'parejas']);
    expect(out[3].text).toBe('Une cada pareja.');
  });
});

describe('stepsOf', () => {
  it('convierte un nivel antiguo intercalando párrafos y preguntas', () => {
    const q = { prompt: 'P', options: ['a', 'b'], answer: 0, explanation: '' };
    const s = stepsOf({ lesson: 'Uno.\n\nDos.', keyPoints: [], cards: [], quiz: [q, q, q] });
    expect(s.map((x) => x.type)).toEqual(['explica', 'elige', 'elige', 'explica', 'elige']);
  });

  it('usa los pasos si los hay', () => {
    const steps = [step({ text: 'Hola' })];
    expect(stepsOf({ lesson: '', keyPoints: [], cards: [], quiz: [], steps })).toBe(steps);
  });
});

describe('comprobaciones', () => {
  it('ordena exige el orden exacto', () => {
    const s = step({ type: 'ordena', options: ['a', 'b', 'c'] });
    expect(checkOrder(s, ['a', 'b', 'c'])).toBe(true);
    expect(checkOrder(s, ['b', 'a', 'c'])).toBe(false);
  });

  it('escribe perdona tildes y una errata', () => {
    const s = step({ type: 'escribe', accepted: ['mitocondria'] });
    expect(checkWrite(s, 'Mitocóndria')).toBe(true);
    expect(checkWrite(s, 'mitocondira')).toBe(true);
    expect(checkWrite(s, 'ribosoma')).toBe(false);
  });

  it('desordena sin dejarlo igual', () => {
    let k = 0;
    const rnd = () => [0.99, 0.99, 0.99][k++ % 3];
    expect(scrambledOrder(['a', 'b', 'c'], rnd)).not.toEqual(['a', 'b', 'c']);
  });

  it('saca el texto y el test de los pasos', () => {
    const steps = [step({ text: 'Idea', example: 'Ej' }), step({ type: 'elige', text: 'P', options: ['a', 'b'], answer: 1 })];
    expect(lessonText(steps)).toBe('Idea\nEjemplo: Ej');
    expect(quizOf(steps)).toEqual([{ prompt: 'P', options: ['a', 'b'], answer: 1, explanation: '' }]);
  });
});
