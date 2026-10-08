import { describe, expect, it } from 'vitest';
import { addCards, beginAttack, build, createStudy, deleteStudy, endAttack, finishExam, finishSession, gradeCard, hydrate, initialState, moveBuilding, studyExams, studyMemory } from './actions';

const now = new Date(2026, 9, 8, 12).getTime();
let n = 0;
const ids = () => `id${n++}`;

describe('acciones', () => {
  it('crea un estudio, añade tarjetas y las repasa', () => {
    let s = createStudy(initialState(), ' Biología ', 'blue', now, 'bio');
    expect(s.studies[0].name).toBe('Biología');
    s = addCards(s, 'bio', [{ front: 'ATP', back: 'Energía' }, { front: '', back: 'vacía' }], now, ids);
    expect(s.cards).toHaveLength(1);
    expect(studyMemory(s, 'bio', now)).toBe(0);
    s = gradeCard(s, s.cards[0].id, 'good', now);
    expect(studyMemory(s, 'bio', now)).toBe(100);
  });

  it('terminar una sesión da monedas, XP, racha y tropas', () => {
    const { state, reward } = finishSession(initialState(), 12, 12, now);
    expect(reward.coins).toBe(120);
    expect(state.wallet.coins).toBe(300 + 120);
    expect(state.streak.days).toBe(1);
    expect(state.village.troops).toBe(1);
  });

  it('construir cobra y no deja solapar', () => {
    const s0 = initialState();
    const ok = build(s0, 'canon', 12, 12, 'c');
    expect(ok.error).toBeNull();
    expect(ok.state.wallet.coins).toBe(50);
    expect(build(ok.state, 'muro', 12, 12, 'm').error).toBe('blocked');
    expect(build(s0, 'ballesta', 12, 12, 'b').error).toBe('coins');
    expect(moveBuilding(ok.state, 'c', 6, 6)).toBe(ok.state); // ahí está el ayuntamiento
    expect(moveBuilding(ok.state, 'c', 11, 12).village.buildings.find((b) => b.id === 'c')!.i).toBe(11);
  });

  it('atacar gasta un ataque del día y da botín', () => {
    const s = { ...initialState(), village: { ...initialState().village, troops: 3 } };
    const a = beginAttack(s, now)!;
    expect(a.village.attacksUsed).toBe(1);
    const { state, loot } = endAttack(a, 50, 2);
    expect(loot).toBe(200);
    expect(state.village.troops).toBe(1);
  });

  it('hidrata estados antiguos sin perder datos', () => {
    const s = hydrate({ studies: [{ id: 'x', name: 'X', color: 'gold', createdAt: 1 }] } as never);
    expect(s.studies).toHaveLength(1);
    expect(s.village.buildings.length).toBeGreaterThan(0);
  });

  it('un examen guarda la nota, paga y se borra con su estudio', () => {
    let s = createStudy(initialState(), 'Historia', 'gold', now, 'h');
    const r = finishExam(s, { id: 'x1', studyId: 'h', at: now, kind: 'rapido', score: 8, correct: 8, total: 10 }, now);
    expect(r.reward.coins).toBe(200);
    s = r.state;
    expect(s.wallet.coins).toBe(500);
    expect(studyExams(s, 'h').map((e) => e.score)).toEqual([8]);
    expect(deleteStudy(s, 'h').exams).toHaveLength(0);
  });
});

import { addChat, createCourse, daily, defensePower, finishLevel, setLevelContent, upgradeBuilding } from './actions';
import { newLevel } from '../logic/course';

describe('cursos, chat y aldea', () => {
  const content = { lesson: 'El morse usa puntos y rayas.', keyPoints: ['E = ·'], cards: [{ front: 'E', back: '·' }, { front: 'T', back: '−' }], quiz: [] };
  const course = { topic: 'Morse', goal: '', start: 'cero' as const, description: 'Curso de morse', levels: [newLevel('Letras E y T', ''), newLevel('A e I', '')] };

  it('aprobar un nivel lo completa, añade sus tarjetas una sola vez y paga', () => {
    let s = createCourse(initialState(), 'm', 'Código morse', course, now);
    s = setLevelContent(s, 'm', 0, content);
    expect(s.studies[0].summary).toContain('El morse usa puntos y rayas.');
    const r = finishLevel(s, 'm', 0, 5, 6, now, ids);
    expect(r.passed).toBe(true);
    expect(r.state.cards).toHaveLength(2);
    expect(r.state.studies[0].course!.levels[0].done).toBe(true);
    const again = finishLevel(r.state, 'm', 0, 6, 6, now, ids);
    expect(again.state.cards).toHaveLength(2);
    expect(again.state.studies[0].course!.levels[0].stars).toBe(3);
  });

  it('el chat guarda como mucho 40 mensajes por estudio', () => {
    let s = initialState();
    for (let k = 0; k < 45; k++) s = addChat(s, 'x', { role: 'user', text: `m${k}`, at: k });
    expect(s.chats.x).toHaveLength(40);
    expect(s.chats.x[0].text).toBe('m5');
  });

  it('las obras cuestan monedas y una sesión de estudio las acelera', () => {
    const s0 = { ...initialState(), wallet: { coins: 2000, gems: 0, xp: 0 } };
    const s1 = upgradeBuilding(s0, 'th', now);
    expect(s1.wallet.coins).toBe(2000 - 750);
    // La primera obra del ayuntamiento dura 20 min: una sesión (−30 min) la termina.
    expect(s1.village.buildings.find((b) => b.id === 'th')!.upgradeUntil).toBe(now + 20 * 60_000);
    const s2 = finishSession(s1, 1, 1, now + 60_000).state;
    const th = s2.village.buildings.find((b) => b.id === 'th')!;
    expect(th.level).toBe(2);
    expect(th.upgradeUntil).toBeUndefined();
  });

  it('la Niebla roba al día siguiente si hay grietas y defensas débiles', () => {
    let s = createStudy(initialState(), 'Bio', 'blue', now, 'b');
    s = addCards(s, 'b', [{ front: 'a', back: 'b' }], now, ids);
    s = gradeCard(s, s.cards[0].id, 'good', now);
    s = daily(s, now);
    expect(s.village.lastRaidDay).not.toBe('');
    const later = now + 3 * 86_400_000;
    expect(defensePower(s, later)).toBe(0);
    const after = daily(s, later);
    expect(after.village.raid!.stolen).toBe(6);
    expect(after.wallet.coins).toBe(300 - 6);
  });
});

describe('mina recién construida', () => {
  it('empieza a producir desde que se construye', async () => {
    const { mineAvailable } = await import('../logic/economy');
    const s = build({ ...initialState(), wallet: { coins: 1000, gems: 0, xp: 0 } }, 'mina', 12, 12, 'm', now).state;
    const m = s.village.buildings.find((b) => b.id === 'm')!;
    expect(mineAvailable(m, now + 2 * 3_600_000)).toBe(30);
  });
});

import { achievementsStatus, claimAchievement, claimMission, missionsToday, removeObstacle } from './actions';

describe('misiones, logros y obstáculos', () => {
  it('repasar cuenta para la misión de repaso, que se cobra una sola vez', () => {
    let s = finishSession(initialState(), 40, 40, now).state;
    const rep = missionsToday(s, now).find((m) => m.key === 'reviews')!;
    expect(rep.done).toBe(true);
    const coins = s.wallet.coins;
    s = claimMission(s, rep.id, now);
    expect(s.wallet.coins).toBe(coins + rep.coins);
    expect(claimMission(s, rep.id, now)).toBe(s);
  });

  it('un logro cumplido da cristales y desbloquea su decoración', () => {
    let s = createStudy(initialState(), 'X', 'blue', now, 'x');
    s = finishSession(s, 100, 100, now).state;
    expect(achievementsStatus(s).filter((a) => a.done).map((a) => a.id)).toEqual(['primer', 'rep100']);
    expect(build({ ...s, wallet: { ...s.wallet, coins: 999 } }, 'farol', 12, 12, 'f').error).toBe('locked');
    const gems = s.wallet.gems;
    s = claimAchievement(s, 'rep100');
    expect(s.wallet.gems).toBe(gems + 2);
    expect(build({ ...s, wallet: { ...s.wallet, coins: 999 } }, 'farol', 12, 12, 'f').error).toBeNull();
  });

  it('quitar una roca cuesta 20 y a veces da un cristal', () => {
    const s = initialState();
    const lucky = removeObstacle(s, 'd5', 0.1, now);
    expect(lucky.gem).toBe(true);
    expect(lucky.state.wallet.coins).toBe(280);
    expect(lucky.state.village.buildings.some((b) => b.id === 'd5')).toBe(false);
    expect(removeObstacle(s, 'th', 0.1, now).state).toBe(s);
  });
});
