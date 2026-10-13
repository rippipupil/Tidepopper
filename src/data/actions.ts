// Cambios del estado: funciones puras (estado → estado nuevo), fáciles de probar.
import type { AppState, Card, ChatMsg, Course, Folder, FolderColor, Grade, LevelContent, Note, QuizRecord, SavedQuiz, Settings } from './types';
import { migrateV1, type V1State } from './migrate';
import { completeLevel } from '../logic/course';
import { newSchedule, review } from '../logic/srs';

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  geminiKey: '',
  groqKey: '',
  theme: 'system',
  podcastRate: 1,
  podcastVoices: { engine: 'device', device: [null, null], gemini: ['Puck', 'Kore'] },
  podcastQuestions: true,
};

export function initialState(): AppState {
  return { version: 2, notes: [], folders: [], cards: [], chats: {}, quizzes: [], settings: { ...DEFAULT_SETTINGS } };
}

/** Completa un estado guardado con los campos que falten y convierte las versiones antiguas. */
export function hydrate(saved: unknown): AppState {
  const base = initialState();
  if (!saved || typeof saved !== 'object') return base;
  const s = saved as Partial<AppState> | V1State;
  const v2: Partial<AppState> = s.version === 1 ? migrateV1(s as V1State, DEFAULT_SETTINGS) : (s as Partial<AppState>);
  return {
    ...base,
    ...v2,
    version: 2,
    notes: (v2.notes ?? []).map((n) => ({ ...n, quizzes: n.quizzes ?? [], sources: n.sources ?? [], keyPoints: n.keyPoints ?? [] })),
    quizzes: v2.quizzes ?? [],
    settings: { ...base.settings, ...v2.settings, podcastVoices: { ...base.settings.podcastVoices, ...v2.settings?.podcastVoices } },
  };
}

// ---------- Notas ----------

export function newNote(id: string, now: number, fields: Partial<Note> = {}): Note {
  return { id, title: 'Nota sin título', emoji: '📝', createdAt: now, updatedAt: now, markdown: '', summary: '', keyPoints: [], sources: [], quizzes: [], ...fields };
}

export function addNote(s: AppState, note: Note): AppState {
  return { ...s, notes: [note, ...s.notes] };
}

export function updateNote(s: AppState, id: string, patch: Partial<Note>, now = Date.now()): AppState {
  return { ...s, notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now } : n)) };
}

const MAX_REVISIONS = 20;

/** Cambia los apuntes guardando la versión anterior para poder volver a ella. */
export function reviseNote(s: AppState, id: string, markdown: string, reason: string, now = Date.now()): AppState {
  return {
    ...s,
    notes: s.notes.map((n) =>
      n.id === id && n.markdown !== markdown ? { ...n, markdown, updatedAt: now, revisions: [...(n.revisions ?? []), { at: now, markdown: n.markdown, reason }].slice(-MAX_REVISIONS) } : n,
    ),
  };
}

/** Vuelve a una versión anterior (la actual también se guarda, por si acaso). */
export function restoreRevision(s: AppState, id: string, at: number, now = Date.now()): AppState {
  const rev = s.notes.find((n) => n.id === id)?.revisions?.find((r) => r.at === at);
  return rev ? reviseNote(s, id, rev.markdown, `Vuelta a la versión de antes de: ${rev.reason}`, now) : s;
}

/** Marca en el chat que un cambio de los apuntes se ha deshecho. */
export function markEditUndone(s: AppState, noteId: string, revision: number): AppState {
  const msgs = s.chats[noteId];
  if (!msgs) return s;
  return { ...s, chats: { ...s.chats, [noteId]: msgs.map((m) => (m.edit?.revision === revision ? { ...m, edit: { ...m.edit, undone: true } } : m)) } };
}

export function deleteNote(s: AppState, id: string): AppState {
  const chats = { ...s.chats };
  delete chats[id];
  return { ...s, notes: s.notes.filter((n) => n.id !== id), cards: s.cards.filter((c) => c.noteId !== id), chats, quizzes: s.quizzes.filter((q) => q.noteId !== id) };
}

// ---------- Quizzes guardados ----------

const MAX_QUIZZES = 150;

export function saveQuiz(s: AppState, quiz: SavedQuiz): AppState {
  return { ...s, quizzes: [quiz, ...s.quizzes.filter((q) => q.id !== quiz.id)].slice(0, MAX_QUIZZES) };
}

export function deleteQuiz(s: AppState, id: string): AppState {
  return { ...s, quizzes: s.quizzes.filter((q) => q.id !== id) };
}

/** Guarda un intento: en el quiz y en las estadísticas de la nota (dominio por tema). */
export function recordAttempt(s: AppState, quizId: string, correct: number, total: number, now = Date.now()): AppState {
  const quiz = s.quizzes.find((q) => q.id === quizId);
  if (!quiz) return s;
  const withQuiz = { ...s, quizzes: s.quizzes.map((q) => (q.id === quizId ? { ...q, attempts: [...q.attempts, { at: now, correct, total }].slice(-30) } : q)) };
  const rec: QuizRecord = { at: now, level: quiz.level, correct, total, ...(quiz.focus ? { focus: quiz.focus, sections: quiz.sections } : {}) };
  return recordQuiz(withQuiz, quiz.noteId, rec);
}

export function bestScore(q: SavedQuiz): number | null {
  return q.attempts.length ? Math.max(...q.attempts.map((a) => Math.round((100 * a.correct) / a.total))) : null;
}

export function recordQuiz(s: AppState, noteId: string, rec: QuizRecord): AppState {
  return { ...s, notes: s.notes.map((n) => (n.id === noteId ? { ...n, quizzes: [...n.quizzes, rec].slice(-30) } : n)) };
}

// ---------- Carpetas ----------

export function addFolder(s: AppState, id: string, name: string, color: FolderColor, now: number): AppState {
  const f: Folder = { id, name: name.trim() || 'Carpeta', color, createdAt: now };
  return { ...s, folders: [...s.folders, f] };
}

export function renameFolder(s: AppState, id: string, name: string): AppState {
  return { ...s, folders: s.folders.map((f) => (f.id === id ? { ...f, name: name.trim() || f.name } : f)) };
}

/** Borra la carpeta; sus notas quedan sin carpeta. */
export function deleteFolder(s: AppState, id: string): AppState {
  return { ...s, folders: s.folders.filter((f) => f.id !== id), notes: s.notes.map((n) => (n.folderId === id ? { ...n, folderId: undefined } : n)) };
}

export function moveNote(s: AppState, noteId: string, folderId: string | undefined): AppState {
  return { ...s, notes: s.notes.map((n) => (n.id === noteId ? { ...n, folderId } : n)) };
}

// ---------- Tarjetas ----------

export function addCards(s: AppState, noteId: string, items: { front: string; back: string; wrong?: string[] }[], now: number, ids: () => string): AppState {
  const seen = new Set(s.cards.filter((c) => c.noteId === noteId).map((c) => c.front.trim().toLowerCase()));
  const cards: Card[] = [];
  items.forEach((c, k) => {
    const front = c.front.trim();
    const back = c.back.trim();
    if (!front || !back || seen.has(front.toLowerCase())) return;
    seen.add(front.toLowerCase());
    const wrong = (c.wrong ?? []).map((w) => w.trim()).filter((w) => w && w !== back);
    cards.push({ id: ids(), noteId, front, back, ...(wrong.length ? { wrong } : {}), createdAt: now + k, sched: newSchedule(now) });
  });
  return { ...s, cards: [...s.cards, ...cards] };
}

export function updateCard(s: AppState, id: string, patch: Partial<Pick<Card, 'front' | 'back' | 'favorite'>>): AppState {
  return { ...s, cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
}

export function deleteCard(s: AppState, id: string): AppState {
  return { ...s, cards: s.cards.filter((c) => c.id !== id) };
}

export function gradeCard(s: AppState, cardId: string, grade: Grade, now: number): AppState {
  return { ...s, cards: s.cards.map((c) => (c.id === cardId ? { ...c, sched: review(c.sched, grade, now) } : c)) };
}

/** Vuelve a dejar las tarjetas de una nota como nuevas. */
export function resetCards(s: AppState, noteId: string, now: number): AppState {
  return { ...s, cards: s.cards.map((c) => (c.noteId === noteId ? { ...c, sched: newSchedule(now) } : c)) };
}

export function noteCards(s: AppState, noteId: string): Card[] {
  return s.cards.filter((c) => c.noteId === noteId);
}

// ---------- Cursos (aprender un tema con la IA) ----------

function mapCourse(s: AppState, noteId: string, fn: (c: Course) => Course): AppState {
  return { ...s, notes: s.notes.map((n) => (n.id === noteId && n.course ? { ...n, course: fn(n.course) } : n)) };
}

/** Guarda la lección generada de un nivel. */
export function setLevelContent(s: AppState, noteId: string, i: number, content: LevelContent): AppState {
  return mapCourse(s, noteId, (c) => ({ ...c, levels: c.levels.map((l, k) => (k === i ? { ...l, content } : l)) }));
}

/** Termina un nivel: estrellas y, al aprobar la primera vez, sus tarjetas pasan al repaso. */
export function finishLevel(s: AppState, noteId: string, i: number, correct: number, total: number, now: number, ids: () => string) {
  const note = s.notes.find((x) => x.id === noteId);
  if (!note?.course) return { state: s, passed: false, stars: 0 };
  const pct = total ? Math.round((100 * correct) / total) : 0;
  const r = completeLevel(note.course, i, pct);
  let next = mapCourse(s, noteId, () => r.course);
  const lv = r.course.levels[i];
  if (r.passed && !lv.cardsAdded && lv.content) {
    next = addCards(next, noteId, lv.content.cards, now, ids);
    next = mapCourse(next, noteId, (c) => ({ ...c, levels: c.levels.map((l, k) => (k === i ? { ...l, cardsAdded: true } : l)) }));
  }
  return { state: next, passed: r.passed, stars: r.stars };
}

// ---------- Chat ----------

export function addChat(s: AppState, noteId: string, msg: ChatMsg): AppState {
  const list = [...(s.chats[noteId] ?? []), msg].slice(-60);
  return { ...s, chats: { ...s.chats, [noteId]: list } };
}

export function clearChat(s: AppState, noteId: string): AppState {
  const chats = { ...s.chats };
  delete chats[noteId];
  return { ...s, chats };
}

// ---------- Ajustes ----------

export function setSettings(s: AppState, patch: Partial<Settings>): AppState {
  return { ...s, settings: { ...s.settings, ...patch } };
}
