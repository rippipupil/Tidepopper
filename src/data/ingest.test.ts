import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { docxText, fileKind, pptxText, titleFromFile, youtubeUrl } from './ingest';

describe('fileKind', () => {
  it('reconoce cada tipo por tipo MIME o extensión', () => {
    expect(fileKind({ name: 'tema1.PDF', type: '' })).toBe('pdf');
    expect(fileKind({ name: 'foto.jpg', type: 'image/jpeg' })).toBe('image');
    expect(fileKind({ name: 'clase.m4a', type: '' })).toBe('audio');
    expect(fileKind({ name: 'clase.mp4', type: 'video/mp4' })).toBe('video');
    expect(fileKind({ name: 'apuntes.docx', type: '' })).toBe('docx');
    expect(fileKind({ name: 'clase.pptx', type: '' })).toBe('pptx');
    expect(fileKind({ name: 'notas.md', type: '' })).toBe('text');
    expect(fileKind({ name: 'raro.xyz', type: '' })).toBe('unknown');
  });
});

describe('Office', () => {
  it('saca el texto de un Word', () => {
    const xml = '<w:document><w:body><w:p><w:r><w:t>Hola </w:t></w:r><w:r><w:t xml:space="preserve">mundo &amp; más</w:t></w:r></w:p><w:p><w:r><w:t>Segundo</w:t></w:r></w:p></w:body></w:document>';
    const zip = zipSync({ 'word/document.xml': strToU8(xml), 'otro.xml': strToU8('<x/>') });
    expect(docxText(zip)).toBe('Hola mundo & más\nSegundo');
  });

  it('saca el texto de un PowerPoint en orden de diapositivas', () => {
    const slide = (t: string) => strToU8(`<p:sld><a:p><a:r><a:t>${t}</a:t></a:r></a:p></p:sld>`);
    const zip = zipSync({ 'ppt/slides/slide10.xml': slide('Diez'), 'ppt/slides/slide2.xml': slide('Dos') });
    expect(pptxText(zip)).toBe('Diapositiva 1:\nDos\n\nDiapositiva 2:\nDiez');
  });
});

describe('youtubeUrl', () => {
  it('normaliza los enlaces de YouTube', () => {
    expect(youtubeUrl('https://youtu.be/dQw4w9WgXcQ?t=3')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(youtubeUrl('youtube.com/watch?list=x&v=dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(youtubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(youtubeUrl('https://vimeo.com/123')).toBeNull();
  });

  it('pone un título limpio a partir del archivo', () => {
    expect(titleFromFile('Tema_3-la_celula.pdf')).toBe('Tema 3 la celula');
  });
});
