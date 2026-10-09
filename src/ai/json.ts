/** Saca el objeto JSON de una respuesta que puede venir con texto o ```json alrededor. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) throw new SyntaxError('No hay ningún objeto JSON en la respuesta.');
  return JSON.parse(body.slice(start, end + 1));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonSchema = any;

/**
 * Arregla lo que suelen fallar los modelos gratis al devolver JSON: campos que faltan,
 * números escritos como texto, verdadero/falso en vez de 1/0, un texto suelto donde va una lista…
 */
export function repairJson(v: unknown, s: JsonSchema): unknown {
  if (!s || typeof s !== 'object' || s.anyOf || s.oneOf) return v;
  if (s.type === 'object') {
    const o: Record<string, unknown> = v && typeof v === 'object' && !Array.isArray(v) ? { ...(v as Record<string, unknown>) } : {};
    for (const [k, sub] of Object.entries(s.properties ?? {})) o[k] = repairJson(o[k], sub);
    return o;
  }
  if (s.type === 'array') {
    const arr = Array.isArray(v) ? v : v == null || v === '' ? [] : [v];
    return arr.map((x) => repairJson(x, s.items));
  }
  if (s.type === 'string') {
    if (v == null) return '';
    const str = Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (Array.isArray(s.enum) && !s.enum.includes(str)) {
      const low = str.toLowerCase().trim();
      return s.enum.find((e: string) => e.toLowerCase() === low) ?? s.enum.find((e: string) => low.startsWith(e.toLowerCase().slice(0, 4))) ?? str;
    }
    return str;
  }
  if (s.type === 'number' || s.type === 'integer') {
    let n = typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : typeof v === 'string' && v.trim() !== '' ? Number(v.trim().replace(',', '.')) : NaN;
    // zod pone ±MAX_SAFE_INTEGER como límites de los enteros: eso no es un mínimo de verdad.
    const min = typeof s.minimum === 'number' && Math.abs(s.minimum) < 1e9 ? s.minimum : undefined;
    const max = typeof s.maximum === 'number' && Math.abs(s.maximum) < 1e9 ? s.maximum : undefined;
    if (!Number.isFinite(n)) n = min ?? -1;
    if (s.type === 'integer') n = Math.round(n);
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    return n;
  }
  if (s.type === 'boolean') return v === true || v === 'true' || v === 1;
  return v;
}

/**
 * Quita de las listas los elementos que no cumplen el esquema (por ejemplo, un paso
 * con un tipo inventado) para no tirar toda la respuesta por uno. Devuelve si quitó algo.
 */
export function pruneInvalid(data: unknown, paths: PropertyKey[][]): boolean {
  const drops = new Map<unknown[], Set<number>>();
  for (const path of paths) {
    let last = -1;
    for (let k = path.length - 1; k >= 0; k--)
      if (typeof path[k] === 'number') {
        last = k;
        break;
      }
    if (last < 0) continue;
    let parent: unknown = data;
    for (const key of path.slice(0, last)) parent = (parent as Record<PropertyKey, unknown>)?.[key];
    if (!Array.isArray(parent)) continue;
    const set = drops.get(parent) ?? new Set<number>();
    set.add(path[last] as number);
    drops.set(parent, set);
  }
  let changed = false;
  for (const [arr, idx] of drops) {
    if (idx.size >= arr.length) continue; // no dejar la lista vacía
    for (const i of [...idx].sort((a, b) => b - a)) arr.splice(i, 1);
    changed = true;
  }
  return changed;
}

/** Esquema JSON limpio para enviarlo a Gemini: sin «$schema» ni los límites enormes de los enteros. */
export function compactSchema(s: JsonSchema): JsonSchema {
  if (Array.isArray(s)) return s.map(compactSchema);
  if (!s || typeof s !== 'object') return s;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === '$schema') continue;
    if ((k === 'minimum' || k === 'maximum') && typeof v === 'number' && Math.abs(v) >= 1e9) continue;
    out[k] = compactSchema(v);
  }
  return out;
}
