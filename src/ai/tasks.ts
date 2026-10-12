import { z } from 'zod';
import { structured, text, type AiKeys, type AiPart } from './engine';
import type { LevelContent, Note, PodcastLength, QuizLevel, LessonStep } from '../data/types';
import { cleanSteps, isExercise, lessonText, quizOf } from '../logic/lesson';

// Tareas de la IA. Cada una se resuelve con la primera IA disponible: Claude,
// Gemini, Groq o, sin claves, copiar y pegar en la app de Claude (ver engine.ts).
export { describeAiError, AiRefusal, testProvider, providers, PROVIDER_NAME, transcribe, youtubeText } from './engine';
export type { AiKeys, AiPart, ProviderId } from './engine';

const CardSchema = z.object({
  front: z.string().describe('Término o pregunta breve y concreta'),
  back: z.string().describe('Respuesta corta y exacta, 1-2 frases'),
  wrong: z.array(z.string()).describe('3 respuestas INCORRECTAS pero muy creíbles, del mismo tipo, formato y longitud que «back» y del mismo tema (si «back» es una letra, otras letras; si es una fecha, otras fechas cercanas; si es una definición, la de un concepto parecido con el que se suele confundir)'),
});

// ---------- Notas ----------

const NoteSchema = z.object({
  title: z.string().describe('Título corto y claro del tema'),
  emoji: z.string().describe('Un solo emoji que represente el tema'),
  summary: z.string().describe('Resumen de 2-4 frases de lo más importante'),
  keyPoints: z.array(z.string()).describe('4-7 ideas clave, una frase cada una'),
  markdown: z.string().describe('Los apuntes completos en Markdown, siguiendo las reglas de formato'),
  cards: z.array(CardSchema).describe('Entre 10 y 25 tarjetas de repaso, de lo más importante a lo menos'),
});
export type GeneratedNote = z.infer<typeof NoteSchema>;

const NOTE_RULES =
  'Eres un experto en tomar apuntes para estudiar. Conviertes el material del alumno en unos apuntes en español excelentes, claros y bonitos.\n' +
  'Formato del campo «markdown» (Markdown):\n' +
  '- Empieza directamente con el contenido (el título ya va aparte). Organiza en secciones «## » con un emoji al principio, y subsecciones «### » si hace falta.\n' +
  '- Frases cortas, viñetas, **negrita** en los términos clave. Explica con tus palabras y añade ejemplos.\n' +
  '- Usa tablas Markdown para comparar o clasificar.\n' +
  '- Usa avisos con «> 💡 » (idea importante), «> ⚠️ » (error típico) y «> 📌 » (definición).\n' +
  '- Fórmulas en LaTeX: $...$ en línea y $$...$$ en bloque.\n' +
  '- Si ayuda a entender (procesos, jerarquías, cronologías), incluye 1 o 2 diagramas en bloques ```mermaid (flowchart TD, mindmap o timeline), con textos cortos y sin paréntesis ni comillas dentro de los nodos.\n' +
  '- Termina con una sección «## 🧠 Para recordar» con lo esencial.\n' +
  'Sé fiel al material: no inventes datos. Si el material es una transcripción, ordénalo y quita relleno.\n' +
  'Las tarjetas se responden sin ver los apuntes, y sus respuestas incorrectas («wrong») deben poder confundirse con la buena.';

/** Convierte el material (PDF, fotos, texto, transcripción, audio, vídeo) en apuntes completos con tarjetas. */
export function generateNote(keys: AiKeys, parts: AiPart[], hint = ''): Promise<GeneratedNote> {
  return structured(keys, {
    schema: NoteSchema,
    maxTokens: 32000,
    effort: 'medium',
    system: NOTE_RULES,
    parts,
    user: `Prepara los apuntes de este material${hint ? ` (${hint})` : ''}.`,
  });
}

const MoreCards = z.object({ cards: z.array(CardSchema).describe('Entre 8 y 15 tarjetas nuevas') });

/** Más tarjetas de una nota, sin repetir las que ya hay. */
export async function generateMoreCards(keys: AiKeys, note: Note, existing: string[]) {
  const out = await structured(keys, {
    schema: MoreCards,
    maxTokens: 8000,
    effort: 'low',
    system: 'Creas tarjetas de repaso en español a partir de unos apuntes. Cada tarjeta: delante un término o pregunta concreta; detrás una respuesta corta y exacta; y 3 respuestas incorrectas que se puedan confundir con la buena.',
    user: `Apuntes «${note.title}»:\n\n${noteContext(note)}\n\nYa existen estas tarjetas (no las repitas):\n${existing.map((f) => `- ${f}`).join('\n') || '(ninguna)'}`,
  });
  return out.cards;
}

/** Todo lo que se sabe de una nota, en texto, para el chat, el quiz y el pódcast. */
export function noteContext(note: Note, max = 60000): string {
  const parts = [note.summary && `RESUMEN: ${note.summary}`, note.markdown && `APUNTES:\n${note.markdown}`, note.transcript && `FUENTE ORIGINAL:\n${note.transcript}`].filter(Boolean);
  const all = parts.join('\n\n');
  return all.length > max ? all.slice(0, max) + '\n[…]' : all;
}

export type NoteAction = 'simplificar' | 'ampliar' | 'ejemplos' | 'traducir';

const ACTION_TEXT: Record<NoteAction, string> = {
  simplificar: 'Reescribe estos apuntes más sencillos y cortos, como para alguien que empieza: frases muy claras y analogías de la vida diaria.',
  ampliar: 'Amplía estos apuntes con más detalle, explicaciones más profundas y ejemplos, sin inventar datos dudosos.',
  ejemplos: 'Mantén los apuntes y añade en cada sección uno o dos ejemplos prácticos o ejercicios resueltos.',
  traducir: 'Traduce estos apuntes al idioma indicado, manteniendo exactamente el formato.',
};

/** Reescribe los apuntes (más fácil, más detalle, con ejemplos, traducidos). Devuelve Markdown. */
export async function transformNote(keys: AiKeys, note: Note, action: NoteAction, lang = 'inglés'): Promise<string> {
  const out = await text(keys, {
    system: `${ACTION_TEXT[action]}${action === 'traducir' ? ` Idioma: ${lang}.` : ''}\n\n${NOTE_RULES.split('\nSé fiel')[0]}\n\nDevuelve SOLO el Markdown de los apuntes, sin comentarios antes ni después.`,
    history: [{ role: 'user', text: `Apuntes «${note.title}»:\n\n${note.markdown}` }],
  });
  return out.replace(/^```(?:markdown|md)?\s*/i, '').replace(/```\s*$/, '').trim();
}

// ---------- Quiz ----------

const Step = z.object({
  type: z
    .enum(['explica', 'elige', 'vf', 'hueco', 'ordena', 'parejas', 'escribe'])
    .describe('explica = idea corta; elige = test; vf = verdadero o falso; hueco = completar la frase; ordena = poner en orden; parejas = unir; escribe = escribir la respuesta'),
  emoji: z.string().describe('Un emoji que ilustre el paso'),
  text: z.string().describe('explica: la idea en 1-3 frases cortas (máx. 250 caracteres). Ejercicios: el enunciado; en «hueco», la frase con ___ donde va la palabra'),
  example: z.string().describe('explica: un ejemplo concreto o una analogía de la vida real, una frase; en los demás, vacío'),
  options: z.array(z.string()).describe('elige: 3-4 opciones; hueco: 3-4 palabras posibles; ordena: 3-5 elementos EN EL ORDEN CORRECTO; demás: vacío'),
  answer: z.number().int().describe('elige y hueco: índice de la correcta; vf: 1 si la frase es verdadera y 0 si es falsa; demás: -1'),
  pairs: z.array(z.object({ a: z.string(), b: z.string() })).describe('parejas: 3-4 parejas (término y su pareja, cortos); demás: vacío'),
  accepted: z.array(z.string()).describe('escribe: respuestas válidas de 1-3 palabras; demás: vacío'),
  explanation: z.string().describe('Ejercicios: por qué es así, una frase corta y animada; explica: vacío'),
});


const QuizSchema = z.object({ questions: z.array(Step).describe('Las preguntas del quiz, todas ejercicios (nunca «explica»)') });

const LEVEL_TEXT: Record<QuizLevel, string> = {
  basico: 'BÁSICO: preguntas directas para comprobar que se recuerdan los conceptos principales.',
  medio: 'MEDIO: mezcla recordar con comprender: relacionar ideas, comparar conceptos parecidos y aplicar a casos sencillos.',
  examen: 'NIVEL EXAMEN: como un examen difícil. Casos prácticos nuevos, detectar errores, comparar conceptos que se confunden, cálculos si el tema los tiene. Las opciones incorrectas son muy creíbles.',
};

/** Quiz de una nota con varios tipos de pregunta, pista y explicación. */
export async function generateQuiz(keys: AiKeys, note: Note, level: QuizLevel, count: number): Promise<LessonStep[]> {
  const out = await structured(keys, {
    schema: QuizSchema,
    maxTokens: 16000,
    effort: 'medium',
    system:
      `Pones quizzes en español para estudiar unos apuntes. Dificultad: ${LEVEL_TEXT[level]}\n` +
      `- Exactamente ${count} preguntas. Mezcla tipos: sobre todo «elige», y también «vf», «hueco», «escribe», «ordena» y «parejas».\n` +
      '- Usa el campo «example» para una PISTA que ayude sin dar la respuesta.\n' +
      '- En «explanation», explica por qué es la correcta y por qué las otras no, en 1-2 frases.\n' +
      '- Las opciones incorrectas son del mismo tipo y formato que la correcta y se confunden con ella; nunca absurdas ni de otro tema.\n' +
      '- Pregunta solo por lo que está en los apuntes.',
    user: `Apuntes «${note.title}»:\n\n${noteContext(note)}`,
  });
  return cleanSteps(out.questions).filter(isExercise).slice(0, count);
}

// ---------- Pódcast ----------

const PodcastSchema = z.object({
  title: z.string().describe('Título atractivo del episodio'),
  lines: z.array(z.object({ host: z.number().int().min(0).max(1).describe('0 = Alex, 1 = Sara'), text: z.string().describe('Lo que dice, 1-4 frases naturales') })),
});

const PODCAST_LEN: Record<PodcastLength, string> = {
  corto: 'unas 14-18 intervenciones (unos 2-3 minutos): lo esencial',
  medio: 'unas 28-36 intervenciones (unos 5-6 minutos)',
  largo: 'unas 50-60 intervenciones (unos 10 minutos): a fondo, con ejemplos',
};

/** Guion de un pódcast de dos presentadores que explican la nota conversando. */
export function generatePodcast(keys: AiKeys, note: Note, length: PodcastLength) {
  return structured(keys, {
    schema: PodcastSchema,
    maxTokens: 16000,
    effort: 'medium',
    system:
      'Escribes el guion de un pódcast educativo en español con dos presentadores: Alex (host 0), curioso, hace preguntas y pone ejemplos; ' +
      'y Sara (host 1), experta y cercana, explica con claridad. Conversación natural y animada, con analogías y algún momento divertido, ' +
      `fiel a los apuntes. Duración: ${PODCAST_LEN[length]}. Empiezan presentando el tema y terminan con un repaso de lo más importante. ` +
      'Escribe para ser leído en voz alta: sin Markdown, sin emojis, sin fórmulas en LaTeX (dilas con palabras).',
    user: `Apuntes «${note.title}»:\n\n${noteContext(note, 40000)}`,
  });
}

// ---------- Chat ----------

/** Responde en el chat sobre una nota, citando las secciones en las que se basa. */
export function chatReply(keys: AiKeys, note: Note, history: { role: 'user' | 'assistant'; text: string }[]): Promise<string> {
  const sections = [...note.markdown.matchAll(/^#{2,3}\s+(.+)$/gm)].map((m) => m[1].trim());
  return text(keys, {
    system:
      'Eres el asistente de estudio de Tidepopper. Respondes en español, claro y breve (como mucho 2-3 párrafos cortos o una lista), con ejemplos cuando ayuden. ' +
      'Puedes usar Markdown sencillo (negrita, listas) y fórmulas $...$. ' +
      'Si te basas en los apuntes, cita la sección al final de la frase así: [[Nombre exacto de la sección]]. ' +
      (sections.length ? `Secciones disponibles: ${sections.map((x) => `[[${x}]]`).join(', ')}. ` : '') +
      'Si la pregunta no tiene que ver con los apuntes, responde igualmente con lo que sabes y dilo.\n\n' +
      `Apuntes «${note.title}»:\n${noteContext(note, 40000)}`,
    history,
  });
}

// ---------- Asistente IA: cursos por niveles ----------

const START_TEXT = { cero: 'empieza desde cero', basico: 'ya sabe lo básico', avanzado: 'tiene un nivel avanzado' } as const;

const Outline = z.object({
  title: z.string().describe('Nombre corto del curso'),
  description: z.string().describe('Qué aprenderá el alumno, 2-3 frases'),
  levels: z.array(z.object({ title: z.string().describe('Título corto del nivel'), goal: z.string().describe('Qué sabrá hacer al terminar el nivel, una frase') })),
});
export type CourseOutline = z.infer<typeof Outline>;

/** Diseña el temario de un curso: niveles de menos a más. */
export async function generateCourseOutline(keys: AiKeys, topic: string, goal: string, start: keyof typeof START_TEXT, levels: number): Promise<CourseOutline> {
  const out = await structured(keys, {
    schema: Outline,
    maxTokens: 4000,
    effort: 'medium',
    system: 'Eres un profesor que diseña cursos cortos en español, con niveles que suben de dificultad poco a poco. Cada nivel se estudia en unos 15 minutos.',
    user: `Tema: ${topic}\nObjetivo del alumno: ${goal || 'aprenderlo bien'}\nEl alumno ${START_TEXT[start]}.\nDiseña un curso de exactamente ${levels} niveles.`,
  });
  return { ...out, levels: out.levels.slice(0, levels) };
}

const Level = z.object({
  steps: z.array(Step).describe('Entre 10 y 14 pasos alternando ideas cortas y ejercicios'),
  keyPoints: z.array(z.string()).describe('3-5 ideas clave del nivel, una frase cada una'),
  cards: z.array(z.object({ front: z.string(), back: z.string(), wrong: z.array(z.string()).describe('3 respuestas INCORRECTAS pero muy creíbles, del mismo tipo, formato y longitud que «back» y del mismo tema (si «back» es una letra, otras letras; si es una fecha, otras fechas cercanas; si es una definición, la de un concepto parecido con el que se suele confundir)') })).describe('5-8 tarjetas de repaso del nivel'),
});
export type GeneratedLevel = LevelContent;

/** Escribe la lección interactiva de un nivel: ideas cortas, ejercicios variados y tarjetas. */
export async function generateLevelContent(
  keys: AiKeys,
  course: { topic: string; goal: string; start: keyof typeof START_TEXT; levels: { title: string; goal: string }[] },
  index: number,
): Promise<GeneratedLevel> {
  const plan = course.levels.map((l, k) => `${k + 1}. ${l.title} — ${l.goal}${k === index ? '   ← ESTE NIVEL' : ''}`).join('\n');
  const out = await structured(keys, {
    schema: Level,
    maxTokens: 16000,
    effort: 'medium',
    system:
      'Diseñas lecciones interactivas en español al estilo Duolingo o Brilliant: se aprende haciendo, no leyendo. Reglas:\n' +
      '- Entre 10 y 14 pasos. El primero es un gancho: una pregunta curiosa, un reto o un dato sorprendente sobre el tema.\n' +
      '- Nunca dos «explica» seguidos. Cada «explica» trae una sola idea en 1-3 frases cortas y un ejemplo concreto o una analogía de la vida real.\n' +
      '- Después de cada idea nueva, un ejercicio que la practique enseguida. Al menos 7 ejercicios y al menos 4 tipos distintos.\n' +
      '- Las opciones incorrectas son del mismo tipo y formato que la correcta y se confunden con ella: conceptos vecinos, errores típicos, valores cercanos. Si la respuesta es una letra, las otras opciones son letras; nunca opciones absurdas o de otro tema.\n' +
      '- Haz pensar: además de recordar, pide aplicar la idea a un caso nuevo, comparar dos conceptos parecidos o detectar un error.\n' +
      '- En «hueco», la frase lleva ___ y las opciones son palabras sueltas.\n' +
      '- El último paso es un ejercicio que mezcla todo lo del nivel.\n' +
      '- Tono cercano y animado, tuteando, español sencillo. Explica solo lo de este nivel, apoyándote en los anteriores.',
    user: `Curso: ${course.topic}\nObjetivo: ${course.goal || 'aprenderlo bien'}\nEl alumno ${START_TEXT[course.start]}.\n\nTemario:\n${plan}\n\nCrea la lección del nivel ${index + 1}.`,
  });
  const steps = cleanSteps(out.steps);
  return { steps, keyPoints: out.keyPoints, cards: out.cards, lesson: lessonText(steps), quiz: quizOf(steps) };
}
