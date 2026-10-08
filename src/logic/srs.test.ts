import { describe, expect, it } from 'vitest';
import { memory, newSchedule, overdue, review, sessionQueue } from './srs';
import type { Card } from '../data/types';

const DAY = 86_400_000;
const now = Date.UTC(2026, 9, 8);
const card = (id: string, sched = newSchedule(now), createdAt = now): Card => ({ id, studyId: 's', front: id, back: id, createdAt, sched });

describe('review', () => {
  it('una tarjeta nueva acertada vuelve en 1 día, luego en 3', () => {
    const a = review(newSchedule(now), 'good', now);
    expect(a.interval).toBe(1);
    expect(a.due).toBe(now + DAY);
    const b = review(a, 'good', a.due);
    expect(b.interval).toBe(3);
  });

  it('los intervalos crecen con la facilidad', () => {
    let s = newSchedule(now);
    for (let k = 0; k < 4; k++) s = review(s, 'good', s.due);
    expect(s.interval).toBeGreaterThan(3);
  });

  it('olvidarla la reinicia y baja la facilidad', () => {
    let s = review(review(newSchedule(now), 'good', now), 'good', now + DAY);
    s = review(s, 'again', now + 4 * DAY);
    expect(s.reps).toBe(0);
    expect(s.lapses).toBe(1);
    expect(s.ease).toBeCloseTo(2.1);
    expect(s.due).toBe(now + 4 * DAY + 60_000);
  });

  it('la facilidad nunca baja de 1.3', () => {
    let s = newSchedule(now);
    for (let k = 0; k < 20; k++) s = review(s, 'again', now);
    expect(s.ease).toBe(1.3);
  });

  it('dudar en una nueva la repite en 10 minutos', () => {
    const s = review(newSchedule(now), 'hard', now);
    expect(s.due).toBe(now + 600_000);
  });
});

describe('memoria y grietas', () => {
  it('sin tarjetas la memoria es null', () => {
    expect(memory([], now)).toBeNull();
  });

  it('cuenta aprendidas y al día; las vencidas son grietas', () => {
    const learned = card('a', { ...newSchedule(now), reps: 2, due: now + DAY });
    const late = card('b', { ...newSchedule(now), reps: 1, due: now - DAY });
    const fresh = card('c');
    const cards = [learned, late, fresh];
    expect(memory(cards, now)).toBe(33);
    expect(overdue(cards, now).map((c) => c.id)).toEqual(['b']);
  });

  it('la sesión pone primero las vencidas y respeta el límite', () => {
    const late = card('late', { ...newSchedule(now), reps: 1, due: now - DAY });
    const fresh1 = card('f1', newSchedule(now), now - 2);
    const fresh2 = card('f2', newSchedule(now), now - 1);
    expect(sessionQueue([fresh2, late, fresh1], now, 2).map((c) => c.id)).toEqual(['late', 'f1']);
  });
});
