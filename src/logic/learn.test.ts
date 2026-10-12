import { describe, expect, it } from 'vitest';
import type { Card } from '../data/types';
import { newSchedule, review } from './srs';
import { cardStatus, dueCount, memoryOf, studyQueue } from './learn';

const DAY = 86_400_000;
const card = (id: string, sched = newSchedule(0), createdAt = 0): Card => ({ id, noteId: 'n', front: id, back: id, createdAt, sched });

describe('learn', () => {
  it('clasifica en nueva, aprendiendo y dominada', () => {
    const fresh = card('a');
    const once = card('b', review(newSchedule(0), 'good', 0));
    let s = newSchedule(0);
    for (const t of [0, DAY, 4 * DAY]) s = review(s, 'good', t);
    const strong = card('c', s);
    expect([fresh, once, strong].map(cardStatus)).toEqual(['new', 'learning', 'mastered']);
    expect(cardStatus(card('d', review(newSchedule(0), 'again', 0)))).toBe('learning');
    expect(memoryOf([fresh, once, strong])).toBe(50);
  });

  it('cuenta las vencidas y pone primero las vencidas y luego las nuevas', () => {
    const due = card('due', review(newSchedule(0), 'good', 0));
    const later = card('later', review(newSchedule(10 * DAY), 'good', 10 * DAY));
    const fresh = card('fresh', newSchedule(0), 5);
    const now = 2 * DAY;
    expect(dueCount([due, later, fresh], now)).toBe(1);
    expect(studyQueue([fresh, later, due], now).map((c) => c.id)).toEqual(['due', 'fresh']);
  });
});
