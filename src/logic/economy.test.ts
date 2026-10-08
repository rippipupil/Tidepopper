import { describe, expect, it } from 'vitest';
import { canUpgrade, collectMine, hitPower, maxLevel, maybeRaid, mineAvailable, raidLoss, settleUpgrades, speedUp, startUpgrade } from './economy';
import { startingVillage } from './village';
import type { Placed, Village } from '../data/types';

const MIN = 60_000;
const now = new Date(2026, 9, 8, 12).getTime();
const withB = (extra: Placed[]): Village => ({ ...startingVillage(), buildings: [...startingVillage().buildings, ...extra] });

describe('obras', () => {
  it('el ayuntamiento limita el nivel de lo demás', () => {
    expect(maxLevel('canon', 1)).toBe(2);
    expect(maxLevel('canon', 4)).toBe(5);
    expect(maxLevel('ayuntamiento', 1)).toBe(5);
    expect(maxLevel('arbol', 3)).toBe(1);
  });

  it('mejorar cobra, ocupa un constructor y termina con el tiempo', () => {
    const v = withB([{ id: 'c', type: 'canon', i: 12, j: 12, level: 1 }]);
    const r = startUpgrade(v, 1000, 'c', now)!;
    expect(r.cost).toBe(375);
    expect(canUpgrade(r.village.buildings, 9999, 'th', now)).toBe('builders');
    expect(settleUpgrades(r.village, now + 9 * MIN).buildings.find((b) => b.id === 'c')!.level).toBe(1);
    const done = settleUpgrades(r.village, now + 10 * MIN).buildings.find((b) => b.id === 'c')!;
    expect(done.level).toBe(2);
    expect(done.upgradeUntil).toBeUndefined();
  });

  it('sin monedas o al máximo no se puede', () => {
    const v = withB([{ id: 'c', type: 'canon', i: 12, j: 12, level: 2 }]);
    expect(canUpgrade(v.buildings, 9999, 'c', now)).toBe('max');
    expect(canUpgrade(v.buildings, 10, 'th', now)).toBe('coins');
  });

  it('estudiar acelera las obras', () => {
    const v = startUpgrade(withB([]), 9999, 'th', now)!.village;
    const fast = settleUpgrades(speedUp(v, 30 * MIN), now);
    expect(fast.buildings.find((b) => b.id === 'th')!.level).toBe(2);
  });
});

describe('mina', () => {
  it('produce por horas con un tope y solo se vacía si estudiaste hoy', () => {
    const m: Placed = { id: 'm', type: 'mina', i: 0, j: 3, level: 1, collectedAt: now - 3 * 3_600_000 };
    expect(mineAvailable(m, now)).toBe(45);
    expect(mineAvailable({ ...m, collectedAt: now - 100 * 3_600_000 }, now)).toBe(120);
    const v = withB([m]);
    expect(collectMine(v, 'm', now, false).coins).toBe(0);
    const r = collectMine(v, 'm', now, true);
    expect(r.coins).toBe(45);
    expect(mineAvailable(r.village.buildings.find((b) => b.id === 'm')!, now)).toBe(0);
  });
});

describe('la Niebla', () => {
  it('roba más con más grietas y menos defensa; los muros ayudan', () => {
    expect(raidLoss(1000, 10, 0, 0)).toBe(60);
    expect(raidLoss(1000, 10, 50, 0)).toBe(30);
    expect(raidLoss(1000, 10, 0, 20)).toBe(48);
    expect(raidLoss(100, 100, 0, 0)).toBe(25);
    expect(raidLoss(1000, 0, 0, 0)).toBe(0);
  });

  it('ataca una vez al día y nunca el primer día', () => {
    const v0 = startingVillage();
    const first = maybeRaid(v0, 500, '2026-10-08', 10, 0);
    expect(first.stolen).toBe(0);
    const next = maybeRaid(first.village, 500, '2026-10-09', 10, 0);
    expect(next.stolen).toBe(60);
    expect(next.village.raid).toMatchObject({ cracks: 10, stolen: 60, seen: false });
    expect(maybeRaid(next.village, 440, '2026-10-09', 10, 0).stolen).toBe(0);
  });
});

describe('laboratorio', () => {
  it('cada nivel hace que cada acierto destruya más', () => {
    expect(hitPower(5, 1)).toBe(20);
    expect(hitPower(5, 3)).toBeCloseTo(26);
  });
});
