import { describe, expect, it } from 'vitest';
import { canBuild, drawOrder, findSpot, isFree, project, size, startingVillage } from './village';
import type { Placed } from '../data/types';

const th: Placed = { id: 'th', type: 'ayuntamiento', i: 6, j: 6, level: 1 };

describe('aldea', () => {
  it('proyecta casillas en rombo 24×12', () => {
    expect(project(0, 0)).toEqual({ x: 193, y: 35 });
    expect(project(1, 0)).toEqual({ x: 205, y: 41 });
    expect(project(0, 1)).toEqual({ x: 181, y: 41 });
  });

  it('el ayuntamiento ocupa 4×4 y bloquea esas casillas', () => {
    expect(size('ayuntamiento')).toBe(4);
    expect(isFree([th], 'canon', 9, 9)).toBe(false);
    expect(isFree([th], 'canon', 10, 6)).toBe(true);
    expect(isFree([th], 'canon', 5, 5)).toBe(false); // 5..6 pisa el 6,6
  });

  it('no deja salir del mapa', () => {
    expect(isFree([], 'canon', 15, 0)).toBe(false);
    expect(isFree([], 'muro', 15, 15)).toBe(true);
  });

  it('mover un edificio ignora su propia posición', () => {
    expect(isFree([th], 'ayuntamiento', 7, 6, 'th')).toBe(true);
  });

  it('comprueba máximo, monedas y sitio', () => {
    const two: Placed[] = [th, { id: 'a', type: 'ballesta', i: 0, j: 0, level: 1 }];
    expect(canBuild(two, 9999, 'ballesta', 12, 12)).toBe('max');
    expect(canBuild([th], 100, 'canon', 12, 12)).toBe('coins');
    expect(canBuild([th], 999, 'canon', 6, 6)).toBe('blocked');
    expect(canBuild([th], 999, 'canon', 12, 12)).toBeNull();
  });

  it('encuentra sitio libre y dibuja de atrás adelante', () => {
    const v = startingVillage();
    const spot = findSpot(v.buildings, 'canon')!;
    expect(isFree(v.buildings, 'canon', spot.i, spot.j)).toBe(true);
    const order = drawOrder(v.buildings).map((b) => b.id);
    expect(order[0]).toBe('d1');
  });
});
