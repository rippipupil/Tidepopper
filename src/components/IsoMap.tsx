import { useEffect, useRef, useState } from 'react';
import type { Placed } from '../data/types';
import { drawOrder, GRID, ORIGIN, project, size, sprite } from '../logic/village';

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

type Mask = { w: number; h: number; alpha: Uint8ClampedArray };
const masks = new Map<string, Mask>();

/** Carga el canal alfa de un sprite para saber qué píxeles son edificio y cuáles transparentes. */
function loadMask(src: string): Promise<void> {
  if (masks.has(src)) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        const alpha = new Uint8ClampedArray(c.width * c.height);
        for (let k = 0; k < alpha.length; k++) alpha[k] = data[k * 4 + 3];
        masks.set(src, { w: c.width, h: c.height, alpha });
      } catch {
        // Sin máscara se usa el rectángulo del sprite.
      }
      resolve();
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}

/** Casilla bajo un punto del mapa (inversa de la proyección isométrica). */
export function tileAt(x: number, y: number): { i: number; j: number } | null {
  const u = (x - ORIGIN.x) / 12;
  const v = (y - ORIGIN.y) / 6;
  const i = Math.floor((v + u) / 2);
  const j = Math.floor((v - u) / 2);
  return i >= 0 && j >= 0 && i < GRID && j < GRID ? { i, j } : null;
}

function footprint(i: number, j: number, n: number): React.CSSProperties {
  const p = project(i, j);
  return { position: 'absolute', left: p.x - n * 12, top: p.y, width: n * 24, height: n * 12, clipPath: 'polygon(50% 0,100% 50%,50% 100%,0 50%)', pointerEvents: 'none' };
}

/** Mapa isométrico de 16×16 casillas con edificios en vóxeles. */
export default function IsoMap({ buildings, zoom = 1, selectedId, ghost, onBuilding, onTile, buildingStyle, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [, setLoaded] = useState(0);
  const order = drawOrder(buildings);
  const sel = buildings.find((b) => b.id === selectedId);

  useEffect(() => {
    const srcs = Array.from(new Set(buildings.map((b) => sprite(b.type).src)));
    void Promise.all(srcs.map(loadMask)).then(() => setLoaded((x) => x + 1));
  }, [buildings]);

  /** El edificio que de verdad está bajo el dedo: el de más adelante con un píxel opaco ahí. */
  const hit = (x: number, y: number): Placed | null => {
    for (let k = order.length - 1; k >= 0; k--) {
      const b = order[k];
      const s = sprite(b.type);
      const p = project(b.i, b.j);
      const lx = Math.floor(x - (p.x - s.ox));
      const ly = Math.floor(y - (p.y - s.oy));
      if (lx < 0 || ly < 0 || lx >= s.w || ly >= s.h) continue;
      const m = masks.get(s.src);
      if (!m || m.alpha[ly * m.w + lx] > 0) return b;
    }
    return null;
  };

  const onClick = (e: React.MouseEvent) => {
    if (!onBuilding && !onTile) return;
    const r = ref.current!.getBoundingClientRect();
    const x = (e.clientX - r.left) / zoom;
    const y = (e.clientY - r.top) / zoom;
    if (onTile) {
      const t = tileAt(x, y);
      if (t) onTile(t.i, t.j);
      return;
    }
    const b = hit(x, y);
    if (b) onBuilding!(b);
  };

  return (
    <div style={{ position: 'relative', width: MAP_W * zoom, height: MAP_H * zoom, margin: '0 auto' }}>
      <div ref={ref} onClick={onClick} style={{ position: 'absolute', left: 0, top: 0, width: MAP_W, height: MAP_H, transform: `scale(${zoom})`, transformOrigin: '0 0', cursor: onBuilding || onTile ? 'pointer' : undefined }}>
        <img src="img/iso/v-suelo.png" alt="" style={{ position: 'absolute', left: 0, top: 30, width: 386, height: 206 }} />
        {sel && <div style={{ ...footprint(sel.i, sel.j, size(sel.type)), background: 'rgba(217,192,138,0.55)' }} />}
        {ghost && <div style={{ ...footprint(ghost.i, ghost.j, size(ghost.type)), background: ghost.ok ? 'rgba(140,197,176,0.65)' : 'rgba(212,144,127,0.75)' }} />}
        {order.map((b) => {
          const s = sprite(b.type);
          const p = project(b.i, b.j);
          const style: React.CSSProperties = { position: 'absolute', left: p.x - s.ox, top: p.y - s.oy, width: s.w, height: s.h, border: 0, padding: 0, background: 'none', pointerEvents: 'none', ...buildingStyle?.(b) };
          // Botón para teclado y lector de pantalla; el ratón y el dedo pasan por el detector de píxeles.
          return onBuilding ? (
            <button key={b.id} style={style} onClick={(e) => (e.stopPropagation(), onBuilding(b))} aria-label={b.type}>
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
        {children}
      </div>
    </div>
  );
}
