// Pasa los datos de la versión 1 (estudios + aldea) a la 2 (notas). No se pierde nada de estudio:
// cada estudio se convierte en una nota con sus tarjetas, su chat, sus fuentes y su curso.
import type { AppState, Card, ChatMsg, Course, Note, NoteSource, Settings } from './types';

interface V1Study {
  id: string;
  name: string;
  createdAt: number;
  summary?: string;
  course?: Course;
}
interface V1Source {
  id: string;
  studyId: string;
  kind: 'pdf' | 'image' | 'text';
  name: string;
  addedAt: number;
  text?: string;
  mediaType?: string;
}
interface V1Card extends Omit<Card, 'noteId'> {
  studyId: string;
}
export interface V1State {
  version: 1;
  studies?: V1Study[];
  sources?: V1Source[];
  cards?: V1Card[];
  chats?: Record<string, ChatMsg[]>;
  settings?: Partial<Settings>;
}

/** Texto del curso en Markdown, para que la nota de un curso también se pueda leer. */
export function courseMarkdown(c: Course): string {
  const levels = c.levels.map((l, k) => `${k + 1}. **${l.title}**: ${l.goal}`).join('\n');
  return `${c.description}\n\n## 🗺️ Temario\n\n${levels}`;
}

export function migrateV1(old: V1State, defaults: Settings): AppState {
  const sources = old.sources ?? [];
  const notes: Note[] = (old.studies ?? []).map((st) => {
    const mine = sources.filter((x) => x.studyId === st.id);
    const text = mine
      .filter((x) => x.kind === 'text' && x.text)
      .map((x) => x.text)
      .join('\n\n');
    const noteSources: NoteSource[] = mine.map((x) => ({ id: x.id, kind: x.kind, name: x.name, addedAt: x.addedAt, mediaType: x.mediaType }));
    const summary = (st.summary ?? '').trim();
    return {
      id: st.id,
      title: st.name,
      emoji: st.course ? '🧭' : '📘',
      createdAt: st.createdAt,
      updatedAt: st.createdAt,
      markdown: st.course ? courseMarkdown(st.course) : summary,
      summary: st.course ? st.course.description : summary.split(/\n\s*\n/)[0] ?? '',
      keyPoints: [],
      transcript: text || undefined,
      sources: noteSources,
      quizzes: [],
      course: st.course,
    };
  });
  const cards: Card[] = (old.cards ?? []).map(({ studyId, ...c }) => ({ ...c, noteId: studyId }));
  return {
    version: 2,
    notes,
    folders: [],
    cards,
    chats: old.chats ?? {},
    quizzes: [],
    settings: { ...defaults, apiKey: old.settings?.apiKey ?? '', geminiKey: old.settings?.geminiKey ?? '', groqKey: old.settings?.groqKey ?? '' },
  };
}
