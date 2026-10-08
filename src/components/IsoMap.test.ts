import { describe, expect, it } from 'vitest';
import { tileAt } from './IsoMap';
import { project } from '../logic/village';

describe('tocar el mapa', () => {
  it('el centro de cada casilla devuelve esa casilla', () => {
    for (const [i, j] of [[0, 0], [5, 9], [15, 15], [12, 3]]) {
      const p = project(i, j);
      expect(tileAt(p.x, p.y + 6)).toEqual({ i, j });
    }
  });
  it('fuera de la isla no hay casilla', () => {
    expect(tileAt(0, 0)).toBeNull();
  });
});
