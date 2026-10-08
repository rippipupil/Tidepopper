import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, bump, dailyMissions, emptyProgress } from './progress';

describe('estadísticas', () => {
  it('suman al total y al día, y el día se reinicia', () => {
    let p = bump(emptyProgress(), '2026-10-08', 'reviews', 12);
    p = bump(p, '2026-10-08', 'reviews', 3);
    expect(p.today.reviews).toBe(15);
    p = bump(p, '2026-10-09', 'games');
    expect(p.today.reviews).toBe(0);
    expect(p.totals.reviews).toBe(15);
    expect(p.today.games).toBe(1);
  });
});

describe('misiones', () => {
  it('3 al día, distintas, una de repasar y estables para el mismo día', () => {
    const m = dailyMissions('2026-10-08');
    expect(m).toHaveLength(3);
    expect(new Set(m.map((x) => x.id)).size).toBe(3);
    expect(m.filter((x) => x.key === 'reviews')).toHaveLength(1);
    expect(dailyMissions('2026-10-08')).toEqual(m);
  });
});

describe('logros', () => {
  it('se cumplen según las estadísticas', () => {
    const p = bump(emptyProgress(), '2026-10-08', 'reviews', 120);
    const e = { streak: 2, studies: 1, courses: 0, thLevel: 1 };
    const done = ACHIEVEMENTS.filter((a) => a.done(p, e)).map((a) => a.id);
    expect(done).toEqual(['primer', 'rep100']);
  });
});
