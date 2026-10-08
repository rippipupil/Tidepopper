import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

// La clave de la API se guarda solo en este dispositivo (Ajustes). La app es
// personal, por eso llama a Claude directamente desde el navegador.
const MODEL = 'claude-opus-5-5';

function client(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export type AiPart =
  | { kind: 'text'; name: string; text: string }
  | { kind: 'pdf'; name: string; base64: string }
  | { kind: 'image'; name: string; base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' };

function toBlocks(parts: AiPart[]): Anthropic.Beta.BetaContentBlockParam[] {
  return parts.map((p): Anthropic.Beta.BetaContentBlockParam => {
    if (p.kind === 'pdf') return { type: 'document', title: p.name, source: { type: 'base64', media_type: 'application/pdf', data: p.base64 } };
    if (p.kind === 'image') return { type: 'image', source: { type: 'base64', media_type: p.mediaType, data: p.base64 } };
    return { type: 'text', text: `Fuente «${p.name}»:\n\n${p.text}` };
  });
}

export class AiRefusal extends Error {}

const StudyPack = z.object({
  summary: z.string().describe('Resumen claro en español, en párrafos cortos, de lo esencial de las fuentes'),
  cards: z
    .array(z.object({ front: z.string().describe('Término o pregunta breve'), back: z.string().describe('Definición o respuesta, 1-2 frases') }))
    .describe('Entre 8 y 40 tarjetas de repaso, de lo más importante a lo menos'),
});
export type StudyPack = z.infer<typeof StudyPack>;

/** Lee PDFs, fotos y textos y devuelve un resumen y tarjetas de repaso. */
export async function generateStudyPack(apiKey: string, studyName: string, parts: AiPart[]): Promise<StudyPack> {
  const res = await client(apiKey).beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: betaZodOutputFormat(StudyPack) },
    system:
      'Eres un profesor que prepara material de estudio en español. Usa solo lo que dicen las fuentes del alumno. ' +
      'Las tarjetas deben poder responderse sin ver las fuentes: un término o pregunta concreta delante, y detrás una respuesta corta y exacta.',
    messages: [{ role: 'user', content: [...toBlocks(parts), { type: 'text', text: `Prepara el material para el estudio «${studyName}».` }] }],
  });
  if (res.stop_reason === 'refusal' || !res.parsed_output) throw new AiRefusal('Claude no ha podido procesar estas fuentes.');
  return res.parsed_output;
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
export async function correctExplanation(apiKey: string, concept: string, reference: string, answer: string): Promise<Correction> {
  const res = await client(apiKey).beta.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: betaZodOutputFormat(Correction) },
    system: 'Eres un profesor amable y exigente. Corriges en español, con frases cortas y concretas, sin repetir la respuesta del alumno.',
    messages: [
      {
        role: 'user',
        content: `Concepto: ${concept}\nReferencia de sus apuntes: ${reference}\n\nExplicación del alumno:\n${answer}\n\nCorrígela sobre 10.`,
      },
    ],
  });
  if (res.stop_reason === 'refusal' || !res.parsed_output) throw new AiRefusal('Claude no ha podido corregir esta respuesta.');
  return res.parsed_output;
}

export function describeAiError(e: unknown): string {
  if (e instanceof AiRefusal) return e.message;
  if (e instanceof Anthropic.AuthenticationError) return 'La clave de la API no es válida. Revísala en Ajustes.';
  if (e instanceof Anthropic.RateLimitError) return 'Demasiadas peticiones seguidas. Espera un minuto y vuelve a probar.';
  if (e instanceof Anthropic.BadRequestError) return `Claude no ha aceptado la petición: ${e.message}`;
  if (e instanceof Anthropic.APIConnectionError) return 'Sin conexión con Claude. Comprueba internet.';
  if (e instanceof Anthropic.APIError) return `Error de Claude (${e.status}). Prueba otra vez.`;
  return 'Algo ha fallado al hablar con Claude.';
}
