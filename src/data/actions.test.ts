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
