import { useEffect, useMemo, useRef } from 'react';
import DOMPurify from 'dompurify';
import 'katex/dist/katex.min.css';
import { markdownToHtml } from '../logic/markdown';

let mermaidReady: Promise<typeof import('mermaid').default> | null = null;
let counter = 0;

function loadMermaid() {
  if (!mermaidReady)
    mermaidReady = import('mermaid').then((m) => {
      const dark = document.documentElement.dataset.theme !== 'light';
      // Etiquetas como texto SVG (no HTML), para que sobrevivan a la limpieza de seguridad.
      m.default.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        fontFamily: 'Lexend Variable, system-ui, sans-serif',
        htmlLabels: false,
        flowchart: { htmlLabels: false, curve: 'basis' },
        themeVariables: dark
          ? { primaryColor: '#1d2636', primaryTextColor: '#ebf0f8', primaryBorderColor: '#6cc4ff', lineColor: '#6cc4ff', secondaryColor: '#253043', tertiaryColor: '#161d2a', textColor: '#ebf0f8', mainBkg: '#1d2636', nodeBorder: '#6cc4ff', clusterBkg: '#161d2a', fontSize: '15px' }
          : { primaryColor: '#eef3f9', primaryTextColor: '#121a2a', primaryBorderColor: '#1b8fe0', lineColor: '#1b8fe0', secondaryColor: '#e2e9f3', tertiaryColor: '#ffffff', textColor: '#121a2a', mainBkg: '#eef3f9', nodeBorder: '#1b8fe0', fontSize: '15px' },
      });
      return m.default;
    });
  return mermaidReady;
}

/** Dibuja los diagramas Mermaid que haya dentro de un elemento. */
async function drawDiagrams(root: HTMLElement) {
  const boxes = [...root.querySelectorAll<HTMLElement>('[data-mermaid]')];
  if (!boxes.length) return;
  const mermaid = await loadMermaid();
  for (const box of boxes) {
    const code = decodeURIComponent(box.dataset.mermaid ?? '');
    try {
      const { svg } = await mermaid.render(`mm${++counter}`, code);
      box.innerHTML = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true, html: true }, ADD_TAGS: ['foreignObject'] });
      box.classList.remove('loading');
    } catch {
      // Si el diagrama tiene errores, se enseña el texto tal cual.
      box.textContent = code;
      box.style.whiteSpace = 'pre-wrap';
      box.style.textAlign = 'left';
      box.classList.remove('loading');
    }
    box.removeAttribute('data-mermaid');
  }
}

/** Muestra Markdown con fórmulas y diagramas. «onCite» recibe la sección citada en el chat. */
export default function Markdown({ text, onCite, className = '' }: { text: string; onCite?: (id: string) => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const html = useMemo(
    () => DOMPurify.sanitize(markdownToHtml(text), { USE_PROFILES: { html: true, mathMl: true, svg: true }, ADD_ATTR: ['data-mermaid', 'data-cite'] }),
    [text],
  );

  useEffect(() => {
    if (ref.current) void drawDiagrams(ref.current);
  }, [html]);

  return (
    <div
      ref={ref}
      className={`md ${className}`}
      onClick={(e) => {
        const b = (e.target as HTMLElement).closest<HTMLElement>('[data-cite]');
        if (b && onCite) onCite(b.dataset.cite!);
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
