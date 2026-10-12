// Notas que se están creando. Siguen en marcha aunque cambies de pantalla, y
// la pantalla de inicio enseña su progreso, como en Turbo.
import { useEffect, useState } from 'react';
import type { AppState, NoteSource, Settings } from './types';
import { addCards, addNote, newNote } from './actions';
import { saveFile, uid } from './db';
import { fileToBase64 } from './files';
import { docxText, fileKind, pptxText, sourceKindOf, titleFromFile } from './ingest';
import type { AiPart } from '../ai/engine';

export type Input =
  | { kind: 'files'; files: File[] }
  | { kind: 'recording'; blob: Blob; seconds: number }
  | { kind: 'youtube'; url: string }
  | { kind: 'text'; text: string; title?: string };

export interface Job {
  id: string;
  title: string;
  status: string;
  progress: number; // 0–1
  error?: string;
  done?: boolean;
  input: Input;
  folderId?: string;
  /** Lo ya conseguido (transcripción, partes) para reintentar sin repetir lo lento. */
  cache?: { parts: AiPart[]; transcript?: string; sources: NoteSource[] };
}

let jobs: Job[] = [];
const listeners = new Set<(j: Job[]) => void>();
const emit = () => listeners.forEach((l) => l(jobs));
const patch = (id: string, p: Partial<Job>) => {
  jobs = jobs.map((j) => (j.id === id ? { ...j, ...p } : j));
  emit();
};

export function useJobs(): Job[] {
  const [list, setList] = useState(jobs);
  useEffect(() => {
    listeners.add(setList);
    setList(jobs);
    return () => {
      listeners.delete(setList);
    };
  }, []);
  return list;
}

export function dismissJob(id: string) {
  jobs = jobs.filter((j) => j.id !== id);
  emit();
}

type Update = (fn: (s: AppState) => AppState) => void;

function inputTitle(input: Input): string {
  if (input.kind === 'files') return titleFromFile(input.files[0]?.name ?? 'Archivos');
  if (input.kind === 'recording') return `Grabación del ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`;
  if (input.kind === 'youtube') return 'Vídeo de YouTube';
  return input.title?.trim() || 'Texto pegado';
}

/** Empieza a crear una nota. Devuelve el id (que será también el de la nota). */
export function startJob(input: Input, settings: Settings, update: Update, folderId?: string): string {
  const job: Job = { id: uid(), title: inputTitle(input), status: 'Preparando…', progress: 0.05, input, folderId };
  jobs = [job, ...jobs];
  emit();
  void run(job.id, settings, update);
  return job.id;
}

export function retryJob(id: string, settings: Settings, update: Update) {
  patch(id, { error: undefined, status: 'Reintentando…', progress: 0.1 });
  void run(id, settings, update);
}

async function gather(job: Job, settings: Settings): Promise<NonNullable<Job['cache']>> {
  const ai = await import('../ai/tasks');
  const parts: AiPart[] = [];
  const sources: NoteSource[] = [];
  const texts: string[] = [];
  const now = Date.now();
  const input = job.input;

  if (input.kind === 'files') {
    for (const f of input.files) {
      const kind = fileKind(f);
      const id = uid();
      sources.push({ id, kind: sourceKindOf(kind), name: f.name, addedAt: now, mediaType: f.type || undefined });
      await saveFile(id, f);
      patch(job.id, { status: `Leyendo «${f.name}»…` });
      if (kind === 'pdf') parts.push({ kind: 'pdf', name: f.name, base64: await fileToBase64(f) });
      else if (kind === 'image') {
        const mediaType = (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(f.type) ? f.type : 'image/jpeg') as 'image/jpeg';
        parts.push({ kind: 'image', name: f.name, base64: await fileToBase64(f), mediaType });
      } else if (kind === 'docx' || kind === 'pptx') {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const t = kind === 'docx' ? docxText(bytes) : pptxText(bytes);
        texts.push(t);
        parts.push({ kind: 'text', name: f.name, text: t });
      } else if (kind === 'audio' || kind === 'video') {
        patch(job.id, { status: `Pasando «${f.name}» a texto…`, progress: 0.2 });
        const t = await ai.transcribe(settings, f, f.name, (s) => patch(job.id, { status: s }));
        texts.push(t);
        parts.push({ kind: 'text', name: `Transcripción de ${f.name}`, text: t });
      } else {
        const t = await f.text();
        texts.push(t);
        parts.push({ kind: 'text', name: f.name, text: t });
      }
    }
  } else if (input.kind === 'recording') {
    const id = uid();
    sources.push({ id, kind: 'audio', name: 'Grabación', addedAt: now, mediaType: input.blob.type || 'audio/webm' });
    await saveFile(id, input.blob);
    patch(job.id, { status: 'Pasando la grabación a texto…', progress: 0.2 });
    const t = await ai.transcribe(settings, input.blob, 'grabacion.webm', (s) => patch(job.id, { status: s }));
    texts.push(t);
    parts.push({ kind: 'text', name: 'Transcripción de la clase', text: t });
  } else if (input.kind === 'youtube') {
    sources.push({ id: uid(), kind: 'youtube', name: 'YouTube', addedAt: now, url: input.url });
    patch(job.id, { status: 'Viendo el vídeo…', progress: 0.2 });
    const t = await ai.youtubeText(settings, input.url);
    texts.push(t);
    parts.push({ kind: 'text', name: `Vídeo ${input.url}`, text: t });
  } else {
    sources.push({ id: uid(), kind: 'text', name: 'Texto', addedAt: now });
    texts.push(input.text);
    parts.push({ kind: 'text', name: input.title?.trim() || 'Texto', text: input.text });
  }
  const transcript = texts.join('\n\n').trim() || undefined;
  return { parts, transcript, sources };
}

async function run(id: string, settings: Settings, update: Update) {
  const job = jobs.find((j) => j.id === id);
  if (!job) return;
  try {
    const cache = job.cache ?? (await gather(job, settings));
    patch(id, { cache, status: 'Escribiendo tus apuntes…', progress: 0.55 });
    const ai = await import('../ai/tasks');
    const hint = job.input.kind === 'recording' ? 'es la transcripción de una clase grabada' : job.input.kind === 'youtube' ? 'es el contenido de un vídeo' : '';
    const g = await ai.generateNote(settings, cache.parts, hint);
    patch(id, { status: 'Creando tarjetas…', progress: 0.9 });
    const now = Date.now();
    const note = newNote(id, now, {
      title: g.title.trim() || job.title,
      emoji: [...g.emoji.trim()][0] ?? '📝',
      summary: g.summary,
      keyPoints: g.keyPoints,
      markdown: g.markdown,
      transcript: cache.transcript,
      sources: cache.sources,
      folderId: job.folderId,
    });
    update((s) => addCards(addNote(s, note), id, g.cards, now, uid));
    patch(id, { status: '¡Listo!', progress: 1, done: true, title: note.title });
    window.setTimeout(() => dismissJob(id), 4000);
  } catch (e) {
    const { describeAiError } = await import('../ai/engine');
    patch(id, { error: describeAiError(e), status: 'No se ha podido crear', progress: 0 });
  }
}
