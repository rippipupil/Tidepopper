// Apuntes en Markdown → HTML: títulos con ancla, tablas, avisos de colores,
// fórmulas (KaTeX), diagramas (Mermaid, se dibujan después) y citas del chat.
import { Marked, type Tokens } from 'marked';
import katex from 'katex';

/** Identificador de un título para enlazarlo (sin tildes, emojis ni signos). */
export function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function math(tex: string, displayMode: boolean): string {
  return katex.renderToString(tex, { displayMode, throwOnError: false, strict: 'ignore' });
}

const marked = new Marked({ gfm: true, breaks: false });

marked.use({
  extensions: [
    {
      name: 'blockMath',
      level: 'block',
      start: (src: string) => {
        const i = src.search(/\$\$|\\\[/);
        return i < 0 ? undefined : i;
      },
      tokenizer(src: string) {
        const m = /^\$\$([\s\S]+?)\$\$[^\S\n]*(?:\n|$)/.exec(src) ?? /^\\\[([\s\S]+?)\\\][^\S\n]*(?:\n|$)/.exec(src);
        if (m) return { type: 'blockMath', raw: m[0], text: m[1].trim() };
        return undefined;
      },
      renderer: (t) => `<div class="katex-block">${math((t as unknown as { text: string }).text, true)}</div>`,
    },
    {
      name: 'inlineMath',
      level: 'inline',
      start: (src: string) => {
        const i = src.search(/\$|\\\(/);
        return i < 0 ? undefined : i;
      },
      tokenizer(src: string) {
        const m = /^\$\$([^$]+?)\$\$/.exec(src) ?? /^\$(?![\s$])((?:\\\$|[^$\n])+?)(?<!\s)\$(?!\d)/.exec(src) ?? /^\\\(([\s\S]+?)\\\)/.exec(src);
        if (m) return { type: 'inlineMath', raw: m[0], text: m[1].trim() };
        return undefined;
      },
      renderer: (t) => math((t as unknown as { text: string }).text, false),
    },
  ],
  renderer: {
    heading(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, t: Tokens.Heading) {
      const inner = this.parser.parseInline(t.tokens);
      return `<h${t.depth} id="${slug(t.text)}">${inner}</h${t.depth}>\n`;
    },
    code(t: Tokens.Code) {
      if ((t.lang ?? '').trim().toLowerCase() === 'mermaid')
        return `<div class="diagram loading" data-mermaid="${esc(encodeURIComponent(t.text))}">Dibujando el diagrama…</div>\n`;
      return `<pre><code>${esc(t.text)}</code></pre>\n`;
    },
  },
});

const CALLOUT: [RegExp, string][] = [
  [/^(⚠️|❗|🚫|❌)/u, 'warn'],
  [/^(📌|📖|🔖|📝)/u, 'def'],
  [/^(💡|✨|🔑|✅|🎯)/u, 'tip'],
];

/** Convierte Markdown en HTML (sin limpiar: el componente lo pasa por DOMPurify). */
export function markdownToHtml(md: string): string {
  // Citas del chat: [[Sección]] → botón que lleva a esa sección de los apuntes.
  const withCites = md.replace(/\[\[([^\]\n]{1,120})\]\]/g, (_, name: string) => `<button class="cite" data-cite="${esc(slug(name))}">§ ${esc(name.trim())}</button>`);
  let html = marked.parse(withCites, { async: false }) as string;
  html = html.replace(/<table>/g, '<div class="table"><table>').replace(/<\/table>/g, '</table></div>');
  html = html.replace(/<blockquote>\s*<p>([^<]{0,4})/g, (all, start: string) => {
    const kind = CALLOUT.find(([re]) => re.test(start.trim()))?.[1];
    return kind ? all.replace('<blockquote>', `<blockquote class="${kind}">`) : all;
  });
  return html;
}

/** Secciones (## y ###) de unos apuntes, para el índice. */
export function outline(md: string): { level: number; text: string; id: string }[] {
  const out: { level: number; text: string; id: string }[] = [];
  let fence = false;
  for (const line of md.split('\n')) {
    if (/^```/.test(line.trim())) fence = !fence;
    if (fence) continue;
    const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) {
      const text = m[2].replace(/[*_`]/g, '');
      out.push({ level: m[1].length, text, id: slug(text) });
    }
  }
  return out;
}

/** Texto plano (para buscar, compartir o leer en voz alta). */
export function plainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/[#>*_`|]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
