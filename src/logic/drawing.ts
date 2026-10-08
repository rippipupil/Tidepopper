// Corrige un dibujo comparándolo con la letra real. Funciona sobre máscaras (1 = tinta).

export const GRID = 32;

/** Valor del percentil `q` (0–1) de una lista ya ordenada. */
function pct(sorted: number[], q: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];
}

/**
 * Recorta la máscara a lo dibujado y la centra en una cuadrícula GRID×GRID conservando proporciones.
 * El recuadro ignora el 2 % de tinta más alejado por cada lado, para que un punto suelto no lo estire.
 */
export function normalizeMask(mask: Uint8Array, w: number, h: number, n = GRID): Uint8Array {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) (xs.push(x), ys.push(y));
  const out = new Uint8Array(n * n);
  if (xs.length === 0) return out;
  xs.sort((a, b) => a - b);
  ys.sort((a, b) => a - b);
  const x0 = pct(xs, 0.02), x1 = pct(xs, 0.98), y0 = pct(ys, 0.02), y1 = pct(ys, 0.98);
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const scale = (n - 4) / Math.max(bw, bh);
  const ox = (n - bw * scale) / 2;
  const oy = (n - bh * scale) / 2;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (mask[y * w + x]) {
        const gx = Math.min(n - 1, Math.floor(ox + (x - x0) * scale));
        const gy = Math.min(n - 1, Math.floor(oy + (y - y0) * scale));
        out[gy * n + gx] = 1;
      }
  return out;
}

export function dilate(m: Uint8Array, n = GRID, r = 1): Uint8Array {
  const out = new Uint8Array(n * n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (!m[y * n + x]) continue;
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const yy = y + dy;
          const xx = x + dx;
          if (yy >= 0 && xx >= 0 && yy < n && xx < n) out[yy * n + xx] = 1;
        }
    }
  return out;
}

/**
 * Parecido (0–100) entre el dibujo y la letra, ya normalizados:
 * precisión = tinta tuya que cae cerca de la letra; cobertura = letra que tu tinta cubre.
 */
export function similarity(user: Uint8Array, target: Uint8Array, n = GRID): number {
  const U = dilate(user, n, 1);
  const T = dilate(target, n, 2);
  let u = 0, uIn = 0, t = 0, tIn = 0;
  for (let k = 0; k < n * n; k++) {
    if (user[k]) {
      u++;
      if (T[k]) uIn++;
    }
    if (target[k]) {
      t++;
      if (U[k]) tIn++;
    }
  }
  if (u === 0 || t === 0) return 0;
  const p = uIn / u;
  const r = tIn / t;
  return p + r === 0 ? 0 : Math.round((200 * p * r) / (p + r));
}

export const PASS_DRAW = 60;
