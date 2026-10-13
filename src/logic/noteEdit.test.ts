import { describe, expect, it } from 'vitest';
import { applyPatch, changedHeading, editScope, isEditRequest, looksTruncated, parseEditOutput, replaceSection } from './noteEdit';
import { splitSections } from './sections';

const MD = ['Intro.', '', '## 🔬 Qué es una célula', 'La unidad de la vida.', '', '## ⚖️ Tipos de células', 'Procariotas y eucariotas.', '### Detalle', 'Más.', '', '## ⚡ Energía y mitocondrias', 'ATP.'].join('\n');

describe('isEditRequest', () => {
  it('reconoce órdenes de cambiar los apuntes', () => {
    for (const t of [
      'Añade un ejemplo al tema 2',
      'añádelo a los apuntes',
      'Corrige la definición de mitocondria',
      '¿Puedes reescribir el tema 1 más claro?',
      'Quiero que añadas una tabla comparativa al tema 2',
      'podrías añadirlo a los apuntes',
      'por favor quita la tabla del tema 3',
      'Guarda esto en mis apuntes',
      'pon un ejemplo en el tema 2',
      'Mejora el resumen',
      'simplifica el tema 3',
      '¿Puedes meter esto en los apuntes?',
    ])
      expect(isEditRequest(t), t).toBe(true);
  });
  it('no confunde preguntas normales', () => {
    for (const t of ['¿Qué es la mitocondria?', 'Explícamelo como si tuviera 10 años', 'Ponme un ejemplo de la vida real', 'Corrígeme si me equivoco: la célula es…', 'quiz sobre el tema 2', 'Resúmelo en 3 frases', '¿Cómo puedo mejorar mi nota?', '¿Puedes explicarme el tema 2?', 'Mejor explícamelo con un ejemplo', '¿Qué cambia entre procariotas y eucariotas?', '¿Cambios en la membrana?'])
      expect(isEditRequest(t), t).toBe(false);
  });
});

describe('editScope', () => {
  it('limita el cambio al tema pedido', () => {
    const sec = (t: string) => { const r = editScope(t, MD); return r.mode === 'section' ? r.section.n : r.mode; };
    expect(sec('añade un ejemplo al tema 2')).toBe(2);
    expect(sec('corrige lo de las mitocondrias')).toBe(3);
    expect(sec('añade un tema nuevo sobre ribosomas')).toBe('patch');
    expect(sec('guarda esto en los apuntes')).toBe('patch');
    expect(sec('reorganiza todos los apuntes')).toBe('full');
  });
});

describe('applyPatch', () => {
  const RECAP = MD + '\n\n## 🧠 Para recordar\nResumen.';
  it('cambia, añade y borra temas por su título', () => {
    const out = applyPatch(RECAP, '## Tipos de células\nNuevo texto.\n\n## 🧫 Ribosomas\nFabrican proteínas.\n\n## ⚡ Energía y mitocondrias\nELIMINAR');
    expect(out).toContain('## Tipos de células\nNuevo texto.\n\n## 🧫 Ribosomas\nFabrican proteínas.\n\n## 🧠 Para recordar');
    expect(out).not.toContain('Procariotas');
    expect(out).not.toContain('ATP');
    expect(out.startsWith('Intro.')).toBe(true);
  });
  it('sin «## » no aplica nada', () => {
    expect(() => applyPatch(MD, 'Texto suelto')).toThrow();
  });
});

describe('parseEditOutput', () => {
  it('separa el cambio del Markdown', () => {
    expect(parseEditOutput('CAMBIO: Añadido un ejemplo.\n---\n## Tema\nTexto')).toEqual({ change: 'Añadido un ejemplo.', markdown: '## Tema\nTexto' });
    expect(parseEditOutput('**CAMBIO:** Corregido.\n---\n```markdown\n## T\nX\n```')).toEqual({ change: 'Corregido.', markdown: '## T\nX' });
    expect(parseEditOutput('CAMBIO: NINGUNO, no es un cambio')).toBeNull();
  });
});

describe('replaceSection', () => {
  it('cambia solo ese tema', () => {
    const s = splitSections(MD)[1];
    const out = replaceSection(MD, s, '## ⚖️ Tipos de células\nProcariotas (bacterias) y eucariotas.\n\n> Ejemplo: E. coli.');
    expect(out).toContain('## 🔬 Qué es una célula\nLa unidad de la vida.');
    expect(out).toContain('> Ejemplo: E. coli.\n\n## ⚡ Energía y mitocondrias\nATP.');
    expect(out).not.toContain('### Detalle');
    expect(replaceSection(MD, s, 'Sin título.')).toContain('## ⚖️ Tipos de células\n\nSin título.');
  });
  it('funciona con el último tema', () => {
    const s = splitSections(MD)[2];
    expect(replaceSection(MD, s, '## ⚡ Energía\nNuevo.').endsWith('## ⚡ Energía\nNuevo.')).toBe(true);
  });
});

describe('comprobaciones', () => {
  it('detecta apuntes cortados y dónde está el cambio', () => {
    expect(looksTruncated('x'.repeat(1000), 'x'.repeat(300), 'añade un ejemplo')).toBe(true);
    expect(looksTruncated('x'.repeat(1000), 'x'.repeat(300), 'simplifica el tema')).toBe(false);
    expect(changedHeading(MD, MD.replace('Más.', 'Mucho más.'))).toBe('detalle');
    expect(changedHeading(MD, MD.replace('ATP.', 'ATP y calor.'))).toBe('energia-y-mitocondrias');
  });
});
