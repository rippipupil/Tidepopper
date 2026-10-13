import { describe, expect, it } from 'vitest';
import { isQuizRequest, parseQuizRequest, splitSections, topicNumbers } from './sections';

const MD = [
  'Intro suelta.',
  '## 🔬 Qué es una célula',
  'La célula es la unidad de la vida.',
  '### Partes',
  'Membrana, citoplasma.',
  '## ⚖️ Tipos de células',
  'Procariotas y eucariotas.',
  '```',
  '## esto no es un tema',
  '```',
  '## ⚡ Energía y mitocondrias',
  'La mitocondria produce ATP.',
  '## 🧠 Para recordar',
  'Resumen.',
].join('\n');

describe('splitSections', () => {
  it('parte por «## » con sus subapartados, ignorando bloques de código', () => {
    const s = splitSections(MD);
    expect(s.map((x) => [x.n, x.title])).toEqual([
      [1, '🔬 Qué es una célula'],
      [2, '⚖️ Tipos de células'],
      [3, '⚡ Energía y mitocondrias'],
      [4, '🧠 Para recordar'],
    ]);
    expect(s[0].body).toContain('### Partes');
    expect(s[1].body).toContain('## esto no es un tema');
  });
});

describe('topicNumbers', () => {
  it('entiende números, listas, rangos, ordinales y «último»', () => {
    expect(topicNumbers('quiz sobre el tema 2', 4)).toEqual([2]);
    expect(topicNumbers('preguntas de los temas 1 y 3', 4)).toEqual([1, 3]);
    expect(topicNumbers('examen del tema 2 al 4', 4)).toEqual([2, 3, 4]);
    expect(topicNumbers('Sección 2-3', 4)).toEqual([2, 3]);
    expect(topicNumbers('quiz del segundo tema', 4)).toEqual([2]);
    expect(topicNumbers('test del último tema', 4)).toEqual([4]);
    expect(topicNumbers('tema 9', 4)).toEqual([]);
  });
});

describe('parseQuizRequest', () => {
  const sections = splitSections(MD);

  it('quiz del tema 2: solo ese tema', () => {
    const r = parseQuizRequest('quiz sobre el tema 2', sections);
    expect(r.sections.map((s) => s.n)).toEqual([2]);
    expect(r.focus).toBe('Tema 2 · Tipos de células');
  });

  it('saca número de preguntas, dificultad y tipos', () => {
    const r = parseQuizRequest('Hazme 15 preguntas difíciles de verdadero o falso del tema 3', sections);
    expect(r).toMatchObject({ count: 15, level: 'examen', types: ['vf'] });
    expect(r.sections.map((s) => s.n)).toEqual([3]);
  });

  it('sin número, busca el tema por su título', () => {
    expect(parseQuizRequest('test de las mitocondrias', sections).sections.map((s) => s.n)).toEqual([3]);
    expect(parseQuizRequest('quiz fácil sobre los tipos de células', sections)).toMatchObject({ level: 'basico' });
    expect(parseQuizRequest('quiz fácil sobre los tipos de células', sections).sections.map((s) => s.n)).toEqual([2]);
  });

  it('si no encuentra tema, deja la petición tal cual para la IA', () => {
    const r = parseQuizRequest('quiz de fórmulas químicas', sections);
    expect(r.sections).toEqual([]);
    expect(r.focus).toBe('quiz de fórmulas químicas');
  });
});

describe('isQuizRequest', () => {
  it('reconoce cuando se pide un quiz en el chat', () => {
    expect(isQuizRequest('quiz sobre el tema 2')).toBe(true);
    expect(isQuizRequest('Hazme preguntas del tema 1')).toBe(true);
    expect(isQuizRequest('ponme a prueba con lo de la energía')).toBe(true);
    expect(isQuizRequest('¿Qué es la mitocondria?')).toBe(false);
    expect(isQuizRequest('¿qué es un test de embarazo?')).toBe(false);
  });
});
