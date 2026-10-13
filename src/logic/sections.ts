// Temas (secciones «## ») de unos apuntes y peticiones de quiz a medida en lenguaje natural:
// «quiz sobre el tema 2», «10 preguntas difíciles de los temas 2 y 3», «test de las mitocondrias»…
import type { QuizLevel, StepType } from '../data/types';
import { slug } from './markdown';
import { normalize } from './text';

export interface Section {
  /** Número de tema, empezando en 1. */
  n: number;
  title: string;
  id: string;
  /** El texto del tema, con su título y sus subapartados. */
  body: string;
  /** Líneas que ocupa en los apuntes: [start, end). */
  start: number;
  end: number;
}

/** Parte los apuntes en temas por sus títulos «## » (sin contar los que hay dentro de bloques de código). */
export function splitSections(md: string): Section[] {
  const out: Section[] = [];
  let fence = false;
  let cur: { title: string; lines: string[]; start: number } | null = null;
  const lines = md.split('\n');
  const push = (end: number) => {
    if (cur) out.push({ n: out.length + 1, title: cur.title, id: slug(cur.title), body: cur.lines.join('\n').trim(), start: cur.start, end });
  };
  lines.forEach((line, i) => {
    if (/^```/.test(line.trim())) fence = !fence;
    const m = !fence && /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) {
      push(i);
      cur = { title: m[1].replace(/[*_`]/g, '').trim(), lines: [line], start: i };
    } else cur?.lines.push(line);
  });
  push(lines.length);
  return out;
}

/** Título sin el emoji del principio. */
export function cleanTitle(t: string): string {
  return t.replace(/^[^\p{L}\p{N}]+/u, '').trim() || t;
}

export interface QuizRequest {
  /** Temas que pide (vacío = toda la nota o algo que la IA tiene que encontrar). */
  sections: Section[];
  count?: number;
  level?: QuizLevel;
  types?: StepType[];
  /** Cómo se enseña lo entendido: «Tema 2 · Tipos de células». */
  focus: string;
}

const QUIZ_WORDS = /\b(quiz+|quizz?es|test|tests|examen|examenes|exámenes|examina(me)?|preguntas?|preg[uú]ntame|ponme|prueba|hazme|haz|dame|crea|genera|quiero|sobre|del|de|la|las|el|los|un|una|unas|unos|tema|temas|seccion|secciones|apartado|parte|solo|solamente|a|fondo|en|y|con|para|que|me|mi)\b/g;

const ORDINALS: Record<string, number> = { primer: 1, primero: 1, primera: 1, segundo: 2, segunda: 2, tercer: 3, tercero: 3, tercera: 3, cuarto: 4, cuarta: 4, quinto: 5, quinta: 5, sexto: 6, sexta: 6, septimo: 7, septima: 7, octavo: 8, octava: 8, noveno: 9, novena: 9, decimo: 10, decima: 10 };

/** Números de tema mencionados: «tema 2», «temas 2 y 3», «del 2 al 4», «2-4», «segundo tema», «último tema». */
export function topicNumbers(text: string, total: number): number[] {
  const t = normalize(text.replace(/(\d)\s*[-–]\s*(\d)/g, '$1 a $2'));
  const nums = new Set<number>();
  const block = /(?:tema|temas|seccion|secciones|apartado|apartados|parte|partes|punto|puntos|capitulo|capitulos|bloque|bloques|unidad|unidades)\s+((?:del?\s+)?\d+(?:\s*(?:,|y|e|-|a|al|hasta)\s*\d+)*)/g;
  for (const m of t.matchAll(block)) {
    const part = m[1];
    const range = /(\d+)\s*(?:-|a|al|hasta)\s*(\d+)/.exec(part);
    if (range) {
      const [a, b] = [Number(range[1]), Number(range[2])].sort((x, y) => x - y);
      for (let k = a; k <= Math.min(b, a + 30); k++) nums.add(k);
    }
    for (const d of part.match(/\d+/g) ?? []) nums.add(Number(d));
  }
  for (const [w, n] of Object.entries(ORDINALS)) if (new RegExp(`\\b${w}\\s+(tema|seccion|apartado|parte|bloque|capitulo)\\b|\\b(tema|seccion|apartado|parte|bloque|capitulo)\\s+${w}\\b`).test(t)) nums.add(n);
  if (/\bultim[oa]\s+(tema|seccion|apartado|parte|bloque|capitulo)\b/.test(t)) nums.add(total);
  return [...nums].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
}

/** Entiende una petición de quiz a medida. */
export function parseQuizRequest(text: string, sections: Section[]): QuizRequest {
  const t = normalize(text);
  const req: QuizRequest = { sections: [], focus: '' };

  const count = /(\d+)\s*(?:preguntas|pregunta|cuestiones|ejercicios)/.exec(t);
  if (count) req.count = Math.max(3, Math.min(30, Number(count[1])));

  if (/(dificil|dificiles|examen|duro|dura|complicad|a fondo|avanzad|trampa)/.test(t)) req.level = 'examen';
  else if (/(facil|faciles|sencill|basic|repaso rapido)/.test(t)) req.level = 'basico';
  else if (/\b(medio|normal)\b/.test(t)) req.level = 'medio';

  const types: StepType[] = [];
  if (/(verdadero o falso|verdadero\/falso|v\/f|\bvof\b)/.test(t)) types.push('vf');
  if (/(tipo test|opcion multiple|opciones|elegir)/.test(t)) types.push('elige');
  if (/(escrib|respuesta escrita|desarrollo)/.test(t)) types.push('escribe');
  if (/(hueco|rellenar|completar)/.test(t)) types.push('hueco');
  if (/(parejas|relacionar|unir)/.test(t)) types.push('parejas');
  if (/(ordenar|orden)/.test(t)) types.push('ordena');
  if (types.length) req.types = types;

  const nums = topicNumbers(text, sections.length);
  if (nums.length) req.sections = nums.map((n) => sections[n - 1]);
  else {
    // Sin número: el tema cuyo título más se parece a lo que pide.
    const words = t.replace(QUIZ_WORDS, ' ').split(/\s+/).filter((w) => w.length > 3 && !/^\d+$/.test(w));
    if (words.length) {
      const stem = (w: string) => w.slice(0, Math.max(4, w.length - 2));
      const scored = sections.map((s) => {
        const title = normalize(cleanTitle(s.title));
        const body = normalize(s.body);
        let score = 0;
        for (const w of words) {
          if (title.includes(stem(w))) score += 3;
          else if (body.includes(stem(w))) score += 1;
        }
        return { s, score };
      });
      const best = Math.max(0, ...scored.map((x) => x.score));
      if (best >= 3) req.sections = scored.filter((x) => x.score === best).map((x) => x.s);
    }
  }

  req.focus = req.sections.length ? req.sections.map((s) => `Tema ${s.n} · ${cleanTitle(s.title)}`).join(' + ') : text.trim();
  return req;
}

/** ¿Está pidiendo un quiz (en el chat)? */
export function isQuizRequest(text: string): boolean {
  const t = normalize(text);
  return /\b(quiz+|quizz?es|test|examen|examina(me)?|ponme a prueba|preguntame|hazme (unas |algunas |)preguntas|dame (unas |algunas |)preguntas|ponme (unas |algunas |)preguntas)\b/.test(t) && !/\b(que es un|como se hace un|como funciona)\b/.test(t);
}
