import { describe, expect, it } from 'vitest';
import { completeLevel, courseProgress, currentLevel, levelState, newLevel, totalStars } from './course';
import type { Course } from '../data/types';

const course = (): Course => ({ topic: 'Morse', goal: '', start: 'cero', description: '', levels: [newLevel('A', ''), newLevel('B', ''), newLevel('C', '')] });

describe('cursos por niveles', () => {
  it('solo el primer nivel está abierto al empezar', () => {
    const c = course();
    expect(currentLevel(c)).toBe(0);
    expect([0, 1, 2].map((i) => levelState(c, i))).toEqual(['current', 'locked', 'locked']);
  });

  it('aprobar (≥60 %) completa el nivel y abre el siguiente', () => {
    const r = completeLevel(course(), 0, 80);
    expect(r.passed).toBe(true);
    expect(r.firstPass).toBe(true);
    expect(r.stars).toBe(2);
    expect(levelState(r.course, 1)).toBe('current');
    expect(courseProgress(r.course)).toBe(33);
  });

  it('suspender no abre nada', () => {
    const r = completeLevel(course(), 0, 50);
    expect(r.passed).toBe(false);
    expect(levelState(r.course, 0)).toBe('current');
  });

  it('no se puede jugar un nivel bloqueado', () => {
    const c = course();
    expect(completeLevel(c, 2, 100).course).toBe(c);
  });

  it('repetir guarda las mejores estrellas y no vuelve a contar como primer aprobado', () => {
    let c = completeLevel(course(), 0, 100).course;
    const r = completeLevel(c, 0, 70);
    c = r.course;
    expect(r.firstPass).toBe(false);
    expect(c.levels[0].stars).toBe(3);
    expect(totalStars(c)).toBe(3);
  });
});
