import { describe, expect, it } from 'vitest';
import { pickDistractors, similarity } from './distractors';

const pool = ['La E', 'La T', 'La A', 'Un punto (•)', 'Corta y rápida.', 'Samuel Morse.', 'La I', 'Una raya (–)'];
const still = () => 0;

describe('similarity', () => {
  it('una letra se parece más a otra letra que a una frase', () => {
    expect(similarity('La E', 'La T')).toBeGreaterThan(similarity('La E', 'Samuel Morse.'));
    expect(similarity('La E', 'La A')).toBeGreaterThan(similarity('La E', 'Corta y rápida.'));
  });

  it('un símbolo se parece más a otro símbolo', () => {
    expect(similarity('Un punto (•)', 'Una raya (–)')).toBeGreaterThan(similarity('Un punto (•)', 'La T'));
  });

  it('comparte tema si comparte palabras', () => {
    expect(similarity('Fabrica proteínas en el ribosoma', 'Transporta proteínas al aparato de Golgi')).toBeGreaterThan(
      similarity('Fabrica proteínas en el ribosoma', 'Guarda el agua de la planta'),
    );
  });
});

describe('pickDistractors', () => {
  it('elige señuelos del mismo tipo que la respuesta (letras con letras)', () => {
    expect(pickDistractors('La E', undefined, pool, 3, still).sort()).toEqual(['La A', 'La I', 'La T']);
  });

  it('usa primero los señuelos escritos por la IA', () => {
    const d = pickDistractors('La E', ['La I', 'La S'], pool, 3, still);
    expect(d.slice(0, 2).sort()).toEqual(['La I', 'La S']);
    expect(d).toHaveLength(3);
    expect(d).not.toContain('La E');
  });

  it('no repite ni devuelve la correcta aunque cambien tildes o mayúsculas', () => {
    const d = pickDistractors('Fotosíntesis', ['fotosintesis', 'Respiración', 'Respiracion'], ['Digestión'], 3, still);
    expect(d).toEqual(['Respiración', 'Digestión']);
  });
});
