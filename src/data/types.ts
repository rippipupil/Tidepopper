// Modelo de datos de Tidepopper. Todo se guarda en el dispositivo (IndexedDB).

export type FolderColor = 'blue' | 'mint' | 'gold' | 'coral';

export interface Study {
  id: string;
  name: string;
  color: FolderColor;
  createdAt: number;
  examDate?: string; // AAAA-MM-DD
  summary?: string;
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
}

export interface Village {
  buildings: Placed[];
  attacksDay: string; // AAAA-MM-DD del último ataque contado
  attacksUsed: number;
  troops: number;
  correctSinceTroop: number;
}

export interface Streak {
  lastDay: string; // AAAA-MM-DD
  days: number;
}

export interface Settings {
  apiKey: string;
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

export interface AppState {
  version: 1;
  studies: Study[];
  sources: Source[];
  cards: Card[];
  exams: ExamRecord[];
  wallet: Wallet;
  village: Village;
  streak: Streak;
  settings: Settings;
}
