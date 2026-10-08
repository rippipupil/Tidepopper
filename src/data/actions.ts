import type { AppState, Card, ExamRecord, FolderColor, Grade, Source, Study } from './types';
import { examReward } from '../logic/exam';
import { memory, newSchedule, overdue, review } from '../logic/srs';
import { applyReward, attackLoot, dayKey, sessionReward, startAttack, touchStreak, trainTroops, type Reward } from '../logic/rewards';
import { canBuild, CATALOG, isFree, startingVillage, type BuildError } from '../logic/village';

export function initialState(): AppState {
  return {
    version: 1,
    studies: [],
    sources: [],
    cards: [],
    exams: [],
    wallet: { coins: 300, gems: 0, xp: 0 },
    village: startingVillage(),
    streak: { lastDay: '', days: 0 },
    settings: { apiKey: '' },
  };
}

/** Completa un estado guardado con los campos que falten (versiones antiguas). */
export function hydrate(saved: Partial<AppState> | undefined): AppState {
  const base = initialState();
  if (!saved) return base;
  return { ...base, ...saved, wallet: { ...base.wallet, ...saved.wallet }, village: { ...base.village, ...saved.village }, settings: { ...base.settings, ...saved.settings } };
}

export function createStudy(s: AppState, name: string, color: FolderColor, now: number, id: string): AppState {
  const study: Study = { id, name: name.trim(), color, createdAt: now };
  return { ...s, studies: [...s.studies, study] };
}

export function deleteStudy(s: AppState, id: string): AppState {
  return {
    ...s,
    studies: s.studies.filter((x) => x.id !== id),
    sources: s.sources.filter((x) => x.studyId !== id),
    cards: s.cards.filter((x) => x.studyId !== id),
    exams: s.exams.filter((x) => x.studyId !== id),
    village: { ...s.village, buildings: s.village.buildings.map((b) => (b.studyId === id ? { ...b, studyId: undefined } : b)) },
  };
}

export function addSource(s: AppState, src: Source): AppState {
  return { ...s, sources: [...s.sources, src] };
}

export function setSummary(s: AppState, studyId: string, summary: string): AppState {
  return { ...s, studies: s.studies.map((x) => (x.id === studyId ? { ...x, summary } : x)) };
}

export function addCards(s: AppState, studyId: string, items: { front: string; back: string }[], now: number, ids: () => string): AppState {
  const cards: Card[] = items
    .filter((c) => c.front.trim() && c.back.trim())
    .map((c, k) => ({ id: ids(), studyId, front: c.front.trim(), back: c.back.trim(), createdAt: now + k, sched: newSchedule(now) }));
  return { ...s, cards: [...s.cards, ...cards] };
}

export function deleteCard(s: AppState, id: string): AppState {
  return { ...s, cards: s.cards.filter((c) => c.id !== id) };
}

export function gradeCard(s: AppState, cardId: string, grade: Grade, now: number): AppState {
  return { ...s, cards: s.cards.map((c) => (c.id === cardId ? { ...c, sched: review(c.sched, grade, now) } : c)) };
}

/** Cierra una sesión de estudio: racha, recompensa y tropas. */
export function finishSession(s: AppState, correct: number, total: number, now: number): { state: AppState; reward: Reward } {
  const streak = touchStreak(s.streak, dayKey(now));
  const reward = sessionReward({ correct, total }, streak.days);
  return {
    reward,
    state: { ...s, streak, wallet: applyReward(s.wallet, reward), village: trainTroops(s.village, correct) },
  };
}

export function studyCards(s: AppState, studyId: string): Card[] {
  return s.cards.filter((c) => c.studyId === studyId);
}

export function studyMemory(s: AppState, studyId: string, now: number): number | null {
  return memory(studyCards(s, studyId), now);
}

export function cracks(s: AppState, now: number): number {
  return overdue(s.cards, now).length;
}

export function build(s: AppState, type: string, i: number, j: number, id: string): { state: AppState; error: BuildError | null } {
  const error = canBuild(s.village.buildings, s.wallet.coins, type, i, j);
  if (error) return { state: s, error };
  const placed = { id, type, i, j, level: 1 };
  return {
    error: null,
    state: { ...s, wallet: { ...s.wallet, coins: s.wallet.coins - CATALOG[type].cost }, village: { ...s.village, buildings: [...s.village.buildings, placed] } },
  };
}

export function moveBuilding(s: AppState, id: string, i: number, j: number): AppState {
  const b = s.village.buildings.find((x) => x.id === id);
  if (!b || !isFree(s.village.buildings, b.type, i, j, id)) return s;
  return { ...s, village: { ...s.village, buildings: s.village.buildings.map((x) => (x.id === id ? { ...x, i, j } : x)) } };
}

export function linkDefense(s: AppState, id: string, studyId: string | undefined): AppState {
  return { ...s, village: { ...s.village, buildings: s.village.buildings.map((x) => (x.id === id ? { ...x, studyId } : x)) } };
}

export function beginAttack(s: AppState, now: number): AppState | null {
  const v = startAttack(s.village, dayKey(now));
  return v ? { ...s, village: v } : null;
}

export function endAttack(s: AppState, destroyedPct: number, troopsUsed: number): { state: AppState; loot: number } {
  const loot = attackLoot(destroyedPct);
  return {
    loot,
    state: { ...s, wallet: { ...s.wallet, coins: s.wallet.coins + loot }, village: { ...s.village, troops: Math.max(0, s.village.troops - troopsUsed) } },
  };
}

export function setExamDate(s: AppState, studyId: string, examDate: string | undefined): AppState {
  return { ...s, studies: s.studies.map((x) => (x.id === studyId ? { ...x, examDate } : x)) };
}

/** Guarda la nota de un examen y paga la recompensa (cuenta como día de estudio). */
export function finishExam(s: AppState, record: ExamRecord, now: number): { state: AppState; reward: Reward } {
  const streak = touchStreak(s.streak, dayKey(now));
  const reward = examReward(record.score, streak.days);
  return {
    reward,
    state: { ...s, streak, exams: [...s.exams, record], wallet: applyReward(s.wallet, reward), village: trainTroops(s.village, record.correct) },
  };
}

export function studyExams(s: AppState, studyId: string): ExamRecord[] {
  return s.exams.filter((e) => e.studyId === studyId).sort((a, b) => b.at - a.at);
}
