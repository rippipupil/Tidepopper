import { describe, expect, it } from 'vitest';
import type { PodcastLine } from '../data/types';
import { feedbackText, isQuestion, lineAtTime, pcmToWav, segments, shuffleQuestions } from './podcast';

const L = (text: string, q = false): PodcastLine => (q ? { host: 0, text, options: ['a', 'b', 'c'], answer: 1, explanation: 'Porque sí.' } : { host: 0, text });

describe('pódcast interactivo', () => {
  it('reconoce las preguntas válidas', () => {
    expect(isQuestion(L('hola'))).toBe(false);
    expect(isQuestion(L('¿?', true))).toBe(true);
    expect(isQuestion({ host: 1, text: '¿?', options: ['a', 'b'], answer: 5 })).toBe(false);
  });

  it('corta los trozos de audio en cada pregunta y cuando son muy largos', () => {
    const lines = [L('uno'), L('dos'), L('¿tres?', true), L('cuatro'), L('x'.repeat(30)), L('y'.repeat(30))];
    expect(segments(lines, 40)).toEqual([[0, 1, 2], [3, 4], [5]]);
  });

  it('dice la respuesta correcta cuando fallas', () => {
    expect(feedbackText(L('¿?', true), false, () => 0)).toBe('Casi, pero no. La respuesta era: b. Porque sí.');
    expect(feedbackText(L('¿?', true), true, () => 0)).toBe('¡Exacto! Porque sí.');
  });

  it('reparte el tiempo del trozo entre sus intervenciones', () => {
    const lines = [L('aaaa'), L('bbbbbbbbbbbb')];
    expect(lineAtTime(lines, [0, 1], 0.5, 8)).toBe(0);
    expect(lineAtTime(lines, [0, 1], 5, 8)).toBe(1);
  });

  it('reparte la respuesta buena entre las 3 opciones', () => {
    const lines = Array.from({ length: 9 }, (_, k) => ({ host: 0 as const, text: `¿${k}?`, options: ['buena', 'mala', 'otra'], answer: 0, explanation: 'x' }));
    const out = shuffleQuestions([{ host: 1, text: 'hola' }, ...lines]);
    expect(out[0]).toEqual({ host: 1, text: 'hola' });
    const count = [0, 0, 0];
    for (const l of out.slice(1)) {
      expect(l.options![l.answer!]).toBe('buena');
      count[l.answer!]++;
    }
    expect(count).toEqual([3, 3, 3]);
    const lettered = { host: 0 as const, text: '¿Es a) uno, b) dos o c) tres?', options: ['uno', 'dos', 'tres'], answer: 0 };
    expect(shuffleQuestions([lettered])[0]).toEqual(lettered);
  });

  it('crea un WAV con su cabecera', async () => {
    const wav = pcmToWav(new Uint8Array(480), 24000);
    const head = new Uint8Array(await wav.arrayBuffer()).slice(0, 12);
    expect(String.fromCharCode(...head.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...head.slice(8, 12))).toBe('WAVE');
    expect(wav.size).toBe(524);
  });
});
