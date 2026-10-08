import { z } from 'zod';
import { structured, text, type AiKeys, type AiPart } from './engine';

// Tareas de la IA. Cada una se resuelve con la primera IA disponible: Claude,
// Gemini, Groq o, sin claves, copiar y pegar en la app de Claude (ver engine.ts).
export { describeAiError, AiRefusal, testProvider, providers, PROVIDER_NAME } from './engine';
export type { AiKeys, AiPart, ProviderId } from './engine';

const StudyPack = z.object({
  summary: z.string().describe('Resumen claro en español, en párrafos cortos, de lo esencial de las fuentes'),
  cards: z
    .array(z.object({ front: z.string().describe('Término o pregunta breve'), back: z.string().describe('Definición o respuesta, 1-2 frases') }))
    .describe('Entre 8 y 40 tarjetas de repaso, de lo más importante a lo menos'),
});
export type StudyPack = z.infer<typeof StudyPack>;

/** Lee PDFs, fotos y textos y devuelve un resumen y tarjetas de repaso. */
export function generateStudyPack(keys: AiKeys, studyName: string, parts: AiPart[]): Promise<StudyPack> {
  return structured(keys, {
    schema: StudyPack,
    maxTokens: 16000,
    effort: 'medium',
    system:
      'Eres un profesor que prepara material de estudio en español. Usa solo lo que dicen las fuentes del alumno. ' +
      'Las tarjetas deben poder responderse sin ver las fuentes: un término o pregunta concreta delante, y detrás una respuesta corta y exacta.',
    parts,
    user: `Prepara el material para el estudio «${studyName}».`,
  });
}

const Correction = z.object({
  score: z.number().int().min(0).max(10),
  good: z.array(z.string()).describe('Lo que está bien, frases cortas'),
  missing: z.array(z.string()).describe('Ideas importantes que faltan'),
  errors: z.array(z.string()).describe('Errores concretos y su corrección'),
  model: z.string().describe('Una respuesta modelo breve'),
});
export type Correction = z.infer<typeof Correction>;

/** Corrige una explicación escrita por el alumno sobre un concepto. */
export function correctExplanation(keys: AiKeys, concept: string, reference: string, answer: string): Promise<Correction> {
  return structured(keys, {
    schema: Correction,
    maxTokens: 4000,
    effort: 'low',
    system: 'Eres un profesor amable y exigente. Corriges en español, con frases cortas y concretas, sin repetir la respuesta del alumno.',
    user: `Concepto: ${concept}\nReferencia de sus apuntes: ${reference}\n\nExplicación del alumno:\n${answer}\n\nCorrígela sobre 10.`,
  });
}

const ExamPack = z.object({
  questions: z
    .array(
      z.object({
        type: z.enum(['choice', 'open']).describe('choice = tipo test; open = desarrollo corto'),
        prompt: z.string().describe('Enunciado de la pregunta'),
        options: z.array(z.string()).describe('4 opciones si es tipo test; vacío si es de desarrollo'),
        answer: z.number().int().describe('Índice (0-3) de la opción correcta; -1 si es de desarrollo'),
        explanation: z.string().describe('Por qué esa es la respuesta correcta, una frase'),
        reference: z.string().describe('Respuesta modelo breve si es de desarrollo; vacío si es tipo test'),
      }),
    )
    .describe('10 preguntas: 8 tipo test y 2 de desarrollo corto, de dificultad variada'),
});

export interface AiExamQuestion {
  type: 'choice' | 'open';
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  reference: string;
}

/** Prepara un examen tipo test + desarrollo a partir del resumen y las tarjetas. */
export async function generateExam(keys: AiKeys, studyName: string, summary: string, cards: { front: string; back: string }[]): Promise<AiExamQuestion[]> {
  const material = [summary ? `RESUMEN:\n${summary}` : '', 'TARJETAS:', ...cards.map((c) => `- ${c.front}: ${c.back}`)].join('\n');
  const out = await structured(keys, {
    schema: ExamPack,
    maxTokens: 16000,
    effort: 'medium',
    system:
      'Eres un profesor que pone exámenes justos en español. Pregunta solo por lo que está en el material del alumno. ' +
      'Las opciones incorrectas deben ser plausibles, no absurdas. Mezcla preguntas de memoria con otras de comprender y relacionar.',
    user: `Pon un examen del tema «${studyName}» con este material:\n\n${material}`,
  });
  return out.questions.filter((q) => (q.type === 'choice' ? q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length : q.prompt.trim().length > 0));
}

const OpenGrades = z.object({
  grades: z.array(z.object({ score: z.number().int().min(0).max(10), feedback: z.string().describe('Qué falta o qué está mal, en una o dos frases') })),
});

/** Corrige de golpe las preguntas de desarrollo de un examen (0–10 cada una). */
export async function gradeOpenAnswers(keys: AiKeys, items: { prompt: string; reference: string; answer: string }[]): Promise<{ score: number; feedback: string }[]> {
  const body = items.map((it, k) => `PREGUNTA ${k + 1}: ${it.prompt}\nRespuesta modelo: ${it.reference}\nRespuesta del alumno: ${it.answer || '(en blanco)'}`).join('\n\n');
  const out = await structured(keys, {
    schema: OpenGrades,
    maxTokens: 4000,
    effort: 'low',
    system: 'Eres un profesor que corrige exámenes en español con criterio y amabilidad. Una respuesta en blanco vale 0. Devuelve una nota por pregunta, en el mismo orden.',
    user: body,
  });
  return items.map((_, k) => out.grades[k] ?? { score: 0, feedback: 'Sin corregir.' });
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
  lesson: z.string().describe('Lección clara en español, 3-6 párrafos cortos separados por una línea en blanco, con ejemplos'),
  keyPoints: z.array(z.string()).describe('3-5 ideas clave, una frase cada una'),
  cards: z.array(z.object({ front: z.string(), back: z.string() })).describe('5-8 tarjetas de repaso del nivel'),
  quiz: z
    .array(z.object({ prompt: z.string(), options: z.array(z.string()).describe('4 opciones'), answer: z.number().int().describe('Índice 0-3 de la correcta'), explanation: z.string() }))
    .describe('6 preguntas tipo test sobre la lección'),
});
export type GeneratedLevel = z.infer<typeof Level>;

/** Escribe la lección, las tarjetas y la práctica de un nivel. */
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
      'Eres un profesor paciente que escribe en español sencillo. Explica solo lo de este nivel, apoyándote en lo que ya se vio en los anteriores. ' +
      'Las preguntas de la práctica deben poder responderse con la lección, y sus opciones incorrectas deben ser creíbles.',
    user: `Curso: ${course.topic}\nObjetivo: ${course.goal || 'aprenderlo bien'}\nEl alumno ${START_TEXT[course.start]}.\n\nTemario:\n${plan}\n\nEscribe el nivel ${index + 1}.`,
  });
  return { ...out, quiz: out.quiz.filter((q) => q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length) };
}

/** Responde en el chat del asistente sobre un estudio concreto. */
export function chatReply(keys: AiKeys, context: string, history: { role: 'user' | 'assistant'; text: string }[]): Promise<string> {
  return text(keys, {
    system:
      'Eres el asistente de estudio de Tidepopper. Respondes en español, claro y breve (como mucho 2-3 párrafos cortos), con ejemplos cuando ayuden. ' +
      'Si te preguntan algo del material del alumno, básate en él. Sin markdown complejo: solo párrafos y, si hace falta, guiones.\n\n' +
      `Material del alumno:\n${context}`,
    history,
  });
}
