import type { AppState, Card, ChatMsg, Course, ExamRecord, FolderColor, Grade, LevelContent, Source, Study } from './types';
import { completeLevel } from '../logic/course';
import { collectMine, labUpgradeCost, maybeRaid, SESSION_SPEEDUP, settleUpgrades, speedUp, startUpgrade } from '../logic/economy';
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
    chats: {},
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
    state: { ...s, streak, wallet: applyReward(s.wallet, reward), village: settleUpgrades(speedUp(trainTroops(s.village, correct), SESSION_SPEEDUP), now) },
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

export function build(s: AppState, type: string, i: number, j: number, id: string, now = Date.now()): { state: AppState; error: BuildError | null } {
  const error = canBuild(s.village.buildings, s.wallet.coins, type, i, j);
  if (error) return { state: s, error };
  const placed = { id, type, i, j, level: 1, collectedAt: type === 'mina' ? now : undefined };
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
    state: { ...s, streak, exams: [...s.exams, record], wallet: applyReward(s.wallet, reward), village: settleUpgrades(speedUp(trainTroops(s.village, record.correct), SESSION_SPEEDUP), now) },
  };
}

export function studyExams(s: AppState, studyId: string): ExamRecord[] {
  return s.exams.filter((e) => e.studyId === studyId).sort((a, b) => b.at - a.at);
}

// ---------- Asistente IA: cursos por niveles ----------

export function createCourse(s: AppState, id: string, name: string, course: Course, now: number): AppState {
  const study: Study = { id, name, color: 'mint', createdAt: now, course, summary: course.description };
  return { ...s, studies: [...s.studies, study] };
}

function mapCourse(s: AppState, studyId: string, fn: (c: Course, st: Study) => Partial<Study>): AppState {
  return { ...s, studies: s.studies.map((x) => (x.id === studyId && x.course ? { ...x, ...fn(x.course, x) } : x)) };
}

/** Guarda la lección generada de un nivel y la añade al resumen del estudio. */
export function setLevelContent(s: AppState, studyId: string, i: number, content: LevelContent): AppState {
  return mapCourse(s, studyId, (c, st) => ({
    course: { ...c, levels: c.levels.map((l, k) => (k === i ? { ...l, content } : l)) },
    summary: `${st.summary ?? ''}\n\nNivel ${i + 1}: ${c.levels[i].title}\n${content.lesson}`.trim(),
  }));
}

/** Termina la práctica de un nivel: estrellas, recompensa y, al aprobar la primera vez, sus tarjetas pasan al repaso. */
export function finishLevel(s: AppState, studyId: string, i: number, correct: number, total: number, now: number, ids: () => string) {
  const st = s.studies.find((x) => x.id === studyId);
  if (!st?.course) return { state: s, reward: null, passed: false, stars: 0 };
  const pct = total ? Math.round((100 * correct) / total) : 0;
  const r = completeLevel(st.course, i, pct);
  let next = mapCourse(s, studyId, () => ({ course: r.course }));
  const lv = r.course.levels[i];
  if (r.passed && !lv.cardsAdded && lv.content) {
    next = addCards(next, studyId, lv.content.cards, now, ids);
    next = mapCourse(next, studyId, (c) => ({ course: { ...c, levels: c.levels.map((l, k) => (k === i ? { ...l, cardsAdded: true } : l)) } }));
  }
  const done = finishSession(next, correct, total, now);
  return { state: done.state, reward: done.reward, passed: r.passed, stars: r.stars };
}

export function addChat(s: AppState, studyId: string, msg: ChatMsg): AppState {
  const list = [...(s.chats[studyId] ?? []), msg].slice(-40);
  return { ...s, chats: { ...s.chats, [studyId]: list } };
}

export function clearChat(s: AppState, studyId: string): AppState {
  const chats = { ...s.chats };
  delete chats[studyId];
  return { ...s, chats };
}

// ---------- Aldea: obras, mina, laboratorio y Niebla ----------

export function upgradeBuilding(s: AppState, id: string, now: number): AppState {
  const r = startUpgrade(s.village, s.wallet.coins, id, now);
  return r ? { ...s, village: r.village, wallet: { ...s.wallet, coins: s.wallet.coins - r.cost } } : s;
}

export function collect(s: AppState, id: string, now: number): { state: AppState; coins: number } {
  const r = collectMine(s.village, id, now, s.streak.lastDay === dayKey(now));
  return { coins: r.coins, state: r.coins ? { ...s, village: r.village, wallet: { ...s.wallet, coins: s.wallet.coins + r.coins } } : s };
}

export function upgradeLab(s: AppState): AppState {
  const cost = labUpgradeCost(s.village.labLevel);
  if (cost === null || s.wallet.gems < cost || !s.village.buildings.some((b) => b.type === 'laboratorio')) return s;
  return { ...s, wallet: { ...s.wallet, gems: s.wallet.gems - cost }, village: { ...s.village, labLevel: s.village.labLevel + 1 } };
}

/** Fuerza media de las defensas (0–100). Una defensa sin estudio o sin tarjetas cuenta como 0. */
export function defensePower(s: AppState, now: number): number {
  const defs = s.village.buildings.filter((b) => CATALOG[b.type].defense);
  if (defs.length === 0) return 0;
  const sum = defs.reduce((acc, b) => acc + (b.studyId ? (studyMemory(s, b.studyId, now) ?? 0) : 0), 0);
  return Math.round(sum / defs.length);
}

/** Al abrir la app: termina obras y, si toca, la Niebla ataca. */
export function daily(s: AppState, now: number): AppState {
  const settled = settleUpgrades(s.village, now);
  const r = maybeRaid(settled, s.wallet.coins, dayKey(now), cracks(s, now), defensePower(s, now));
  if (r.village === s.village) return s;
  return { ...s, village: r.village, wallet: { ...s.wallet, coins: s.wallet.coins - r.stolen } };
}

export function markRaidSeen(s: AppState): AppState {
  return s.village.raid ? { ...s, village: { ...s.village, raid: { ...s.village.raid, seen: true } } } : s;
}
