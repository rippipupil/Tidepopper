// Modelo de datos de Tidepopper. Todo se guarda en el dispositivo (IndexedDB).

export type FolderColor = 'blue' | 'mint' | 'gold' | 'coral';

export interface Study {
  id: string;
  name: string;
  color: FolderColor;
  createdAt: number;
  examDate?: string; // AAAA-MM-DD
  summary?: string;
  course?: Course; // solo en los estudios creados por el asistente IA
  alphabet?: string; // id de alfabeto para el juego de dibujar letras
}

export interface LevelQuestion {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface LevelContent {
  lesson: string;
  keyPoints: string[];
  cards: { front: string; back: string }[];
  quiz: LevelQuestion[];
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

export interface Course {
  topic: string;
  goal: string;
  start: 'cero' | 'basico' | 'avanzado';
  description: string;
  levels: CourseLevel[];
}

export interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
  at: number;
}

export type SourceKind = 'pdf' | 'image' | 'text';

export interface Source {
  id: string;
  studyId: string;
  kind: SourceKind;
  name: string;
  addedAt: number;
  text?: string; // solo para fuentes de texto
  mediaType?: string; // para pdf / imagen; el archivo va aparte (clave file:<id>)
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
  studyId: string;
  front: string;
  back: string;
  createdAt: number;
  sched: Schedule;
}

export type Grade = 'again' | 'hard' | 'good';

export interface Wallet {
  coins: number;
  gems: number;
  xp: number;
}

export interface Placed {
  id: string;
  type: string;
  i: number;
  j: number;
  level: number;
  studyId?: string; // defensas: estudio que las alimenta
  upgradeUntil?: number; // en obras hasta (ms)
  collectedAt?: number; // minas: última recogida (ms)
}

export interface RaidReport {
  day: string;
  cracks: number;
  defense: number; // 0–100
  stolen: number;
  seen: boolean;
}

export interface Village {
  buildings: Placed[];
  attacksDay: string; // AAAA-MM-DD del último ataque contado
  attacksUsed: number;
  troops: number;
  correctSinceTroop: number;
  labLevel: number; // 1–5: fuerza de las tropas
  lastRaidDay: string;
  raid: RaidReport | null;
}

export interface Streak {
  lastDay: string; // AAAA-MM-DD
  days: number;
}

export interface Settings {
  /** Clave de la API de Claude (de pago). */
  apiKey: string;
  /** Clave gratis de Google AI Studio. */
  geminiKey: string;
  /** Clave gratis de Groq. */
  groqKey: string;
}

export interface ExamRecord {
  id: string;
  studyId: string;
  at: number;
  kind: 'rapido' | 'ia';
  score: number; // nota sobre 10, con un decimal
  correct: number;
  total: number;
}

export type StatKey = 'reviews' | 'games' | 'mixed' | 'letters' | 'levels' | 'exams' | 'examsPassed' | 'attacks' | 'built' | 'removed';

export interface Progress {
  totals: Record<StatKey, number>;
  day: string;
  today: Record<StatKey, number>;
  bestExam: number;
  missionsClaimed: string[]; // de hoy
  achievements: string[]; // logros ya cobrados
}

export interface AppState {
  version: 1;
  studies: Study[];
  sources: Source[];
  cards: Card[];
  exams: ExamRecord[];
  chats: Record<string, ChatMsg[]>; // por estudio
  progress: Progress;
  wallet: Wallet;
  village: Village;
  streak: Streak;
  settings: Settings;
}
