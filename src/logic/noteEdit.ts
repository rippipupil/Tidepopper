// Cambios en los apuntes pedidos desde el chat: «añade un ejemplo al tema 2»,
// «corrige la definición de mitocondria», «guarda esto en los apuntes»…
import { slug } from './markdown';
import { cleanTitle, parseQuizRequest, splitSections, type Section } from './sections';
import { normalize } from './text';

// Raíces de verbos que, si se piden como orden («añade…», «puedes añadir…», «quiero que añadas…»),
// son un cambio en los apuntes.
const STRONG = '(?:anad|agreg|inclu|reescrib|corrig|corrij|correg|modific|quit|elimin|borr|ampli|simplific|actualiz|reorganiz|reestructur|cambi|mejor|guard|apunt|integr|sustitu|reemplaz|complet|desarroll|acort)';
// Raíces que solo lo son si se habla de los apuntes («pon un ejemplo» puede ser una pregunta).
const WEAK = '(?:pon|mete|meta|escrib|anot)';
const POLITE = '(?:(?:por favor|porfa|vale|ok|oye|y|ahora|tambien|me puedes|me podrias|puedes|podrias|quiero que|quisiera que|me gustaria que|necesito que|haz que)\\s+)*';
const NOTES = /\b(apuntes|nota|notas|tema|temas|seccion|apartado|resumen|definicion|esquema|tabla|ejemplo|ejemplos)\b/;

/** ¿Pide cambiar los apuntes (y no solo preguntar)? */
export function isEditRequest(text: string): boolean {
  const t = normalize(text);
  // Primera palabra útil: el verbo. «Corrígeme…» o «explícame…» no cuentan (terminan en «me»).
  const m = new RegExp(`^(${POLITE})(\\S+)`).exec(t);
  const verb = m?.[2] ?? '';
  if (/me$/.test(verb) || /^(mejor|completo)$/.test(verb)) return false;
  // Una pregunta («¿Cambios en…?») solo es una orden si la pide («¿puedes añadir…?»).
  if (text.includes('?') && !/(puedes|podrias)/.test(m?.[1] ?? '')) return false;
  if (new RegExp(`^${STRONG}`).test(verb)) return true;
  if (new RegExp(`^${WEAK}`).test(verb) && !/^ponme|^meteme/.test(verb) && NOTES.test(t)) return true;
  return /\b(en|a) (los|mis|tus) apuntes\b/.test(t) && new RegExp(`\\b(${STRONG}|${WEAK}|explica|pasa)\\w*`).test(t);
}

export type EditScope = { mode: 'section'; section: Section } | { mode: 'patch' } | { mode: 'full' };

/**
 * Qué parte hay que reescribir: solo un tema («añade un ejemplo al tema 2»), solo los temas que cambien
 * (la IA devuelve únicamente esos) o los apuntes enteros («reorganiza todos los apuntes»).
 */
export function editScope(text: string, md: string): EditScope {
  const t = normalize(text);
  if (/\b(todos los apuntes|los apuntes enteros|apuntes completos|todo el documento|todos los temas|todas las secciones|reorganiza|reestructura|reordena|desde cero|de arriba abajo|de principio a fin)\b/.test(t)) return { mode: 'full' };
  if (/\b(nuevo tema|tema nuevo|nueva seccion|seccion nueva|nuevo apartado|apartado nuevo|al final|al principio)\b/.test(t)) return { mode: 'patch' };
  const found = parseQuizRequest(text, splitSections(md)).sections;
  return found.length === 1 ? { mode: 'section', section: found[0] } : { mode: 'patch' };
}

const sameTitle = (a: string, b: string) => slug(cleanTitle(a)) === slug(cleanTitle(b));

/**
 * Aplica los temas que devuelve la IA: cambia los que ya existen (por su título), borra los que vienen
 * con «ELIMINAR» y añade los nuevos antes de «Para recordar» (o al final).
 */
export function applyPatch(md: string, patch: string): string {
  const parts = splitSections(patch);
  if (!parts.length) throw new Error('La IA no ha indicado qué tema cambiar.');
  let out = md;
  for (const p of parts) {
    const current = splitSections(out);
    const old = current.find((s) => sameTitle(s.title, p.title));
    const remove = /^\(?\s*ELIMINAR\s*\)?\.?$/i.test(p.body.split('\n').slice(1).join('\n').trim());
    if (old) out = remove ? removeLines(out, old.start, old.end) : replaceSection(out, old, p.body);
    else if (!remove) {
      const recap = current.at(-1) && /recordar|resumen|repaso/i.test(current.at(-1)!.title) ? current.at(-1)! : null;
      const lines = out.replace(/\s+$/, '').split('\n');
      const at = recap ? recap.start : lines.length;
      out = [...lines.slice(0, at), ...(at > 0 && lines[at - 1]?.trim() ? [''] : []), ...p.body.split('\n'), '', ...lines.slice(at)].join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }
  }
  return out;
}

function removeLines(md: string, start: number, end: number): string {
  const lines = md.split('\n');
  return [...lines.slice(0, start), ...lines.slice(end)].join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export interface EditResult {
  /** Qué ha cambiado, en una frase. */
  change: string;
  markdown: string;
}

/** Lee la respuesta de la IA: «CAMBIO: …», «---» y el Markdown. null si dice que no hay nada que cambiar. */
export function parseEditOutput(raw: string): EditResult | null {
  const text = raw.replace(/\r/g, '').trim();
  const head = /^\s*\**CAMBIO\**:\s*(.+)/i.exec(text);
  if (head && /^NINGUNO/i.test(head[1].trim())) return null;
  const sep = /\n\s*-{3,}\s*\n/.exec(text);
  let change = head ? head[1].trim() : 'Apuntes actualizados';
  let md = sep && head ? text.slice(sep.index + sep[0].length) : head ? text.slice(head[0].length) : text;
  md = md.trim().replace(/^```(?:markdown|md)?\s*\n/i, '').replace(/\n```\s*$/, '').trim();
  change = change.replace(/\*+/g, '').replace(/\s*-{3,}\s*$/, '').trim();
  if (!md) throw new Error('La IA no ha devuelto los apuntes.');
  return { change, markdown: md };
}

/** Cambia un tema por su nueva versión (que debe empezar por su título «## »). */
export function replaceSection(md: string, section: Section, next: string): string {
  const lines = md.split('\n');
  let body = next.trim();
  if (!/^##\s/.test(body)) body = `${lines[section.start]}\n\n${body.replace(/^#\s.*\n+/, '')}`;
  const after = lines.slice(section.end);
  return [...lines.slice(0, section.start), ...body.split('\n'), ...(after.length ? [''] : []), ...after].join('\n').replace(/\n{3,}/g, '\n\n');
}

/** ¿La versión nueva es sospechosamente corta (la IA cortó el texto)? */
export function looksTruncated(before: string, after: string, request: string): boolean {
  if (/\b(quita|elimina|borra|simplifica|acorta|resume|resumelo|mas corto|reduce)\b/.test(normalize(request))) return after.length < before.length * 0.15;
  return after.length < before.length * 0.6;
}

/** Id del primer título (## o ###) cuyo contenido ha cambiado, para llevarte a verlo. */
export function changedHeading(before: string, after: string): string | undefined {
  const a = before.split('\n');
  const b = after.split('\n');
  let i = 0;
  while (i < b.length && a[i] === b[i]) i++;
  if (i >= b.length && a.length === b.length) return undefined;
  for (let k = Math.min(i, b.length - 1); k >= 0; k--) {
    const m = /^#{2,3}\s+(.+?)\s*#*\s*$/.exec(b[k]);
    if (m) return slug(m[1].replace(/[*_`]/g, ''));
  }
  return undefined;
}
