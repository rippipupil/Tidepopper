// Material de entrada → partes para la IA. Lee PDF, fotos, Word, PowerPoint, texto,
// audio y vídeo (que se transcriben) y enlaces de YouTube.
import { unzipSync, strFromU8 } from 'fflate';
import type { SourceKind } from './types';

export type InputKind = 'pdf' | 'image' | 'audio' | 'video' | 'docx' | 'pptx' | 'text' | 'unknown';

export function fileKind(f: { name: string; type: string }): InputKind {
  const name = f.name.toLowerCase();
  const t = f.type.toLowerCase();
  if (t === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (t.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic)$/.test(name)) return 'image';
  if (t.startsWith('audio/') || /\.(mp3|m4a|wav|ogg|oga|opus|webm|aac|flac)$/.test(name)) return 'audio';
  if (t.startsWith('video/') || /\.(mp4|mov|mkv|avi|m4v)$/.test(name)) return 'video';
  if (name.endsWith('.docx')) return 'docx';
  if (name.endsWith('.pptx')) return 'pptx';
  if (t.startsWith('text/') || /\.(txt|md|markdown|csv|json|html?)$/.test(name)) return 'text';
  return 'unknown';
}

export function sourceKindOf(k: InputKind): SourceKind {
  if (k === 'docx' || k === 'pptx') return 'doc';
  if (k === 'unknown') return 'text';
  return k;
}

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');

/** Texto de un .docx: un párrafo por línea. */
export function docxText(bytes: Uint8Array): string {
  const files = unzipSync(bytes, { filter: (f) => f.name === 'word/document.xml' });
  const xml = strFromU8(files['word/document.xml'] ?? new Uint8Array());
  return xml
    .split(/<\/w:p>/)
    .map((p) => decodeXml([...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('')))
    .filter((p) => p.trim())
    .join('\n');
}

/** Texto de un .pptx, diapositiva a diapositiva. */
export function pptxText(bytes: Uint8Array): string {
  const files = unzipSync(bytes, { filter: (f) => /^ppt\/slides\/slide\d+\.xml$/.test(f.name) });
  const slides = Object.keys(files).sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  return slides
    .map((name, k) => {
      const xml = strFromU8(files[name]);
      const paras = xml
        .split(/<\/a:p>/)
        .map((p) => decodeXml([...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join('')))
        .filter((p) => p.trim());
      return `Diapositiva ${k + 1}:\n${paras.join('\n')}`;
    })
    .join('\n\n');
}

/** Enlace de YouTube normalizado (o null si no lo es). */
export function youtubeUrl(raw: string): string | null {
  const s = raw.trim();
  const m =
    /^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)([\w-]{11})/i.exec(s) ?? /^(?:https?:\/\/)?youtu\.be\/([\w-]{11})/i.exec(s);
  return m ? `https://www.youtube.com/watch?v=${m[1]}` : null;
}

/** Nombre de nota a partir de un archivo (sin extensión ni guiones bajos). */
export function titleFromFile(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Nota';
}
