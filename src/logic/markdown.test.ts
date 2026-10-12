import { describe, expect, it } from 'vitest';
import { markdownToHtml, outline, slug } from './markdown';

describe('markdownToHtml', () => {
  it('pone ancla a los títulos y envuelve las tablas', () => {
    const html = markdownToHtml('## 🧬 La célula\n\n| a | b |\n|---|---|\n| 1 | 2 |');
    expect(html).toContain('<h2 id="la-celula">');
    expect(html).toContain('<div class="table"><table>');
  });

  it('colorea los avisos según el emoji', () => {
    expect(markdownToHtml('> ⚠️ Ojo con esto')).toContain('<blockquote class="warn">');
    expect(markdownToHtml('> 💡 Truco')).toContain('<blockquote class="tip">');
    expect(markdownToHtml('> 📌 Definición')).toContain('<blockquote class="def">');
  });

  it('dibuja fórmulas en línea y en bloque', () => {
    const html = markdownToHtml('La energía es $E = mc^2$ y\n\n$$a^2 + b^2 = c^2$$\n\nfin. Cuesta 5$ y 3$.');
    expect(html).toContain('class="katex"');
    expect(html).toContain('katex-display');
    expect(html).toContain('5$ y 3$');
  });

  it('deja los diagramas para dibujarlos después', () => {
    const html = markdownToHtml('```mermaid\nflowchart TD\n  A --> B\n```');
    expect(html).toContain('data-mermaid="flowchart%20TD');
  });

  it('convierte las citas del chat en botones', () => {
    expect(markdownToHtml('Es así [[La célula]].')).toContain('<button class="cite" data-cite="la-celula">§ La célula</button>');
  });
});

describe('outline', () => {
  it('lista las secciones sin contar los bloques de código', () => {
    expect(outline('## Uno\ntexto\n```\n## no\n```\n### Dos **bis**')).toEqual([
      { level: 2, text: 'Uno', id: 'uno' },
      { level: 3, text: 'Dos bis', id: 'dos-bis' },
    ]);
    expect(slug('¿Qué es el ADN? 🧬')).toBe('que-es-el-adn');
  });
});
