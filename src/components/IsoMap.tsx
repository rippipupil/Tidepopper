import type { Placed } from '../data/types';
import { drawOrder, GRID, project, size, sprite } from '../logic/village';

export const MAP_W = 386;
export const MAP_H = 242;

interface Props {
  buildings: Placed[];
  zoom?: number;
  selectedId?: string | null;
  ghost?: { type: string; i: number; j: number; ok: boolean } | null;
  onBuilding?: (b: Placed) => void;
  onTile?: (i: number, j: number) => void;
  buildingStyle?: (b: Placed) => React.CSSProperties | undefined;
  children?: React.ReactNode;
}

function footprint(i: number, j: number, n: number): React.CSSProperties {
  const p = project(i, j);
  return { position: 'absolute', left: p.x - n * 12, top: p.y, width: n * 24, height: n * 12, clipPath: 'polygon(50% 0,100% 50%,50% 100%,0 50%)', pointerEvents: 'none' };
}

/** Mapa isométrico de 16×16 casillas con edificios en vóxeles. */
export default function IsoMap({ buildings, zoom = 1, selectedId, ghost, onBuilding, onTile, buildingStyle, children }: Props) {
  const sel = buildings.find((b) => b.id === selectedId);
  const tiles: { i: number; j: number }[] = [];
  if (onTile) for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) tiles.push({ i, j });

  return (
    <div style={{ position: 'relative', width: MAP_W * zoom, height: MAP_H * zoom, margin: '0 auto' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: MAP_W, height: MAP_H, transform: `scale(${zoom})`, transformOrigin: '0 0' }}>
        <img src="img/iso/v-suelo.png" alt="" style={{ position: 'absolute', left: 0, top: 30, width: 386, height: 206 }} />
        {sel && <div style={{ ...footprint(sel.i, sel.j, size(sel.type)), background: 'rgba(217,192,138,0.55)' }} />}
        {ghost && <div style={{ ...footprint(ghost.i, ghost.j, size(ghost.type)), background: ghost.ok ? 'rgba(140,197,176,0.65)' : 'rgba(212,144,127,0.75)' }} />}
        {drawOrder(buildings).map((b) => {
          const s = sprite(b.type);
          const p = project(b.i, b.j);
          const style: React.CSSProperties = { position: 'absolute', left: p.x - s.ox, top: p.y - s.oy, width: s.w, height: s.h, border: 0, padding: 0, background: 'none', ...buildingStyle?.(b) };
          return onBuilding ? (
            <button key={b.id} style={{ ...style, cursor: 'pointer' }} onClick={() => onBuilding(b)} aria-label={b.type}>
              <img src={s.src} alt="" style={{ display: 'block', width: '100%', height: '100%' }} />
            </button>
          ) : (
            <img key={b.id} src={s.src} alt="" style={style} />
          );
        })}
        {ghost &&
          (() => {
            const s = sprite(ghost.type);
            const p = project(ghost.i, ghost.j);
            return <img src={s.src} alt="" style={{ position: 'absolute', left: p.x - s.ox, top: p.y - s.oy, width: s.w, height: s.h, opacity: 0.8, pointerEvents: 'none' }} />;
          })()}
        {tiles.map((t) => {
          const p = project(t.i, t.j);
          return (
            <button
              key={`${t.i}-${t.j}`}
              aria-label={`Casilla ${t.i + 1}, ${t.j + 1}`}
              onClick={() => onTile!(t.i, t.j)}
              className="isotile"
              style={{ position: 'absolute', left: p.x - 12, top: p.y, width: 24, height: 12, border: 0, padding: 0, cursor: 'pointer', clipPath: 'polygon(50% 0,100% 50%,50% 100%,0 50%)' }}
            />
          );
        })}
        {children}
      </div>
    </div>
  );
}
