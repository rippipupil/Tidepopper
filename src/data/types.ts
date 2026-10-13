// Modelo de datos de Tidepopper. Todo se guarda en el dispositivo (IndexedDB).
// Una «nota» es la unidad de estudio: apuntes generados, tarjetas, quiz, chat y pódcast.

export type FolderColor = 'sky' | 'violet' | 'mint' | 'amber' | 'rose' | 'slate';

export interface Folder {
  id: string;
  name: string;
  color: FolderColor;
  createdAt: number;
}

/** De dónde sale una nota. Los archivos van aparte en IndexedDB (clave file:<id>). */
export type SourceKind = 'pdf' | 'image' | 'text' | 'audio' | 'video' | 'youtube' | 'doc' | 'topic';

export interface NoteSource {
  id: string;
  kind: SourceKind;
  name: string;
  addedAt: number;
  mediaType?: string;
  url?: string;
}

export interface LevelQuestion {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

/** Tipos de paso de una lección o un quiz: explicaciones cortas y ejercicios. */
export type StepType = 'explica' | 'elige' | 'vf' | 'hueco' | 'ordena' | 'parejas' | 'escribe';

export interface LessonStep {
  type: StepType;
  emoji: string;
  /** explica: la idea; ejercicios: el enunciado (en «hueco», con ___ donde va la palabra). */
  text: string;
  /** explica: un ejemplo o analogía; en un quiz, una pista. */
  example: string;
  /** elige y hueco: opciones; ordena: elementos en el orden correcto. */
  options: string[];
  /** elige y hueco: índice de la correcta; vf: 1 verdadero, 0 falso. */
  answer: number;
  pairs: { a: string; b: string }[];
  /** escribe: respuestas válidas. */
  accepted: string[];
  /** Por qué es así, tras responder. */
  explanation: string;
}

export interface LevelContent {
  lesson: string;
  keyPoints: string[];
  cards: { front: string; back: string; wrong?: string[] }[];
  quiz: LevelQuestion[];
  /** Lección interactiva paso a paso (los niveles antiguos no la tienen). */
  steps?: LessonStep[];
}

export interface CourseLevel {
  title: string;
  goal: string;
  done: boolean;
  stars: number; // 0–3, la mejor conseguida
  best: number; // mejor % de aciertos
  cardsAdded: boolean;
  content?: LevelContent;
}

/** Curso por niveles que diseña la IA a partir de un tema. */
export interface Course {
  topic: string;
  goal: string;
  start: 'cero' | 'basico' | 'avanzado';
  description: string;
  levels: CourseLevel[];
}

export interface PodcastLine {
  host: 0 | 1;
  text: string;
  /** Si la intervención es una pregunta al oyente: opciones, la correcta y lo que explica el otro presentador. */
  options?: string[];
  answer?: number;
  explanation?: string;
}

export type PodcastLength = 'corto' | 'medio' | 'largo';
export type PodcastStyle = 'charla' | 'clase' | 'debate' | 'entrevista';

export interface Podcast {
  length: PodcastLength;
  style?: PodcastStyle;
  /** Nombres de los dos presentadores (antes siempre Alex y Sara). */
  hosts?: [string, string];
  title: string;
  lines: PodcastLine[];
  createdAt: number;
}

/** Voces del pódcast: las del dispositivo (gratis, sin internet) o las realistas de Gemini (gratis con clave). */
export interface PodcastVoices {
  engine: 'device' | 'gemini';
  /** Índice de voz del dispositivo para cada presentador (null = automática). */
  device: [number | null, number | null];
  /** Voz de Gemini para cada presentador. */
  gemini: [string, string];
}

export type QuizLevel = 'basico' | 'medio' | 'examen';

export interface QuizRecord {
  at: number;
  level: QuizLevel;
  correct: number;
  total: number;
  /** Quiz a medida: lo que se preguntó («Tema 2 · Tipos de células»). */
  focus?: string;
  /** Ids de los temas («## ») a los que se ciñó el quiz. */
  sections?: string[];
}

export interface Note {
  id: string;
  title: string;
  emoji: string;
  folderId?: string;
  createdAt: number;
  updatedAt: number;
  /** Los apuntes en Markdown: títulos, tablas, emojis, fórmulas ($…$) y diagramas (```mermaid). */
  markdown: string;
  summary: string;
  keyPoints: string[];
  /** La fuente en texto: transcripción de la grabación, texto pegado o extraído. */
  transcript?: string;
  sources: NoteSource[];
  podcast?: Podcast;
  quizzes: QuizRecord[];
  course?: Course;
  /** Versiones anteriores de los apuntes (la más reciente al final), para deshacer cambios. */
  revisions?: Revision[];
}

export interface Revision {
  /** Cuándo se guardó esta versión (justo antes del cambio). */
  at: number;
  markdown: string;
  /** El cambio que vino después: «Añadido un ejemplo al tema 2». */
  reason: string;
}

/** Programación de repaso de una tarjeta (repetición espaciada). */
export interface Schedule {
  due: number; // ms epoch: cuándo vuelve a tocar
  interval: number; // días
  ease: number; // multiplicador de intervalo
  reps: number; // aciertos seguidos
  lapses: number; // veces olvidada
}

export interface Card {
  id: string;
  noteId: string;
  front: string;
  back: string;
  /** Respuestas incorrectas pero creíbles que escribió la IA, para los señuelos. */
  wrong?: string[];
  favorite?: boolean;
  createdAt: number;
  sched: Schedule;
}

export type Grade = 'again' | 'hard' | 'good';

export interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
  at: number;
  /** Respuesta del chat que ofrece empezar un quiz a medida con esta petición. */
  quiz?: string;
  /** Respuesta del chat que ha cambiado los apuntes: la versión de antes y dónde mirar. */
  edit?: { revision: number; section?: string; undone?: boolean };
}

export type Theme = 'system' | 'dark' | 'light';

export interface Settings {
  /** Clave de la API de Claude (de pago). */
  apiKey: string;
  /** Clave gratis de Google AI Studio. */
  geminiKey: string;
  /** Clave gratis de Groq. */
  groqKey: string;
  theme: Theme;
  /** Velocidad del pódcast (1 = normal). */
  podcastRate: number;
  podcastVoices: PodcastVoices;
  /** Preguntas que pausan el pódcast. */
  podcastQuestions: boolean;
}

export interface AppState {
  version: 2;
  notes: Note[];
  folders: Folder[];
  cards: Card[];
  chats: Record<string, ChatMsg[]>; // por nota
  settings: Settings;
}
