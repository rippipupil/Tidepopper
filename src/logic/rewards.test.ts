import { describe, expect, it } from 'vitest';
import { attackLoot, attacksLeft, levelInfo, sessionReward, startAttack, touchStreak, trainTroops } from './rewards';
import type { Village } from '../data/types';

const v0: Village = { buildings: [], attacksDay: '', attacksUsed: 0, troops: 0, correctSinceTroop: 0 };

describe('racha', () => {
  it('sube si ayer estudiaste', () => {
    expect(touchStreak({ lastDay: '2026-10-07', days: 4 }, '2026-10-08')).toEqual({ lastDay: '2026-10-08', days: 5 });
  });
  it('no cambia si hoy ya contaba', () => {
    const s = { lastDay: '2026-10-08', days: 4 };
    expect(touchStreak(s, '2026-10-08')).toBe(s);
  });
  it('vuelve a 1 si saltaste un día (también entre meses)', () => {
    expect(touchStreak({ lastDay: '2026-09-29', days: 9 }, '2026-10-01').days).toBe(1);
    expect(touchStreak({ lastDay: '2026-09-30', days: 9 }, '2026-10-01').days).toBe(10);
  });
});

describe('recompensa de sesión', () => {
  it('paga por acierto y la racha multiplica', () => {
    expect(sessionReward({ correct: 10, total: 12 }, 1).coins).toBe(100);
    expect(sessionReward({ correct: 10, total: 12 }, 3).coins).toBe(120);
    expect(sessionReward({ correct: 10, total: 12 }, 8).coins).toBe(150);
  });
  it('una sesión perfecta de 10+ da un cristal', () => {
    expect(sessionReward({ correct: 10, total: 10 }, 1).gems).toBe(1);
    expect(sessionReward({ correct: 9, total: 9 }, 1).gems).toBe(0);
  });
  it('sin respuestas no hay nada', () => {
    expect(sessionReward({ correct: 0, total: 0 }, 5)).toEqual({ coins: 0, xp: 0, gems: 0, stars: 0 });
  });
});

describe('niveles', () => {
  it('calcula nivel y progreso', () => {
    expect(levelInfo(0)).toEqual({ level: 1, into: 0, need: 100 });
    expect(levelInfo(100).level).toBe(2);
    expect(levelInfo(350)).toEqual({ level: 3, into: 50, need: 300 });
  });
});

describe('tropas y ataques', () => {
  it('10 aciertos = 1 tropa y guarda el resto', () => {
    const v = trainTroops(v0, 23);
    expect(v.troops).toBe(2);
    expect(v.correctSinceTroop).toBe(3);
    expect(trainTroops(v, 7).troops).toBe(3);
  });
  it('máximo 2 ataques al día; se reinicia al día siguiente', () => {
    const armed = { ...v0, troops: 5 };
    const a1 = startAttack(armed, '2026-10-08')!;
    const a2 = startAttack(a1, '2026-10-08')!;
    expect(attacksLeft(a2, '2026-10-08')).toBe(0);
    expect(startAttack(a2, '2026-10-08')).toBeNull();
    expect(attacksLeft(a2, '2026-10-09')).toBe(2);
    expect(startAttack(a2, '2026-10-09')!.attacksUsed).toBe(1);
  });
  it('sin tropas no se puede atacar', () => {
    expect(startAttack(v0, '2026-10-08')).toBeNull();
  });
  it('el botín depende del % destruido', () => {
    expect(attackLoot(75)).toBe(300);
    expect(attackLoot(140)).toBe(400);
  });
});
