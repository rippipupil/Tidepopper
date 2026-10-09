import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { compactSchema, extractJson, pruneInvalid, repairJson } from './json';
import { AiCancelled, askManual } from './manual';

// Las claves se guardan solo en este dispositivo (Perfil). La app es personal,
// por eso llama a la IA directamente desde el navegador.
//
// Orden: Claude (de pago, si hay clave) → Gemini (gratis) → Groq (gratis, solo
// texto) → copiar y pegar en la app de Claude (gratis, sin límite de la app).
// Si uno falla (sin cuota, sin red, clave mala…) se pasa al siguiente.

export interface AiKeys {
  apiKey: string;
  geminiKey?: string;
  groqKey?: string;
}

export type AiPart =
  | { kind: 'text'; name: string; text: string }
  | { kind: 'pdf'; name: string; base64: string }
  | { kind: 'image'; name: string; base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' };

export class AiRefusal extends Error {}
/** Error ya explicado para el alumno. */
export class AiError extends Error {}

export type ProviderId = 'claude' | 'gemini' | 'groq';
export const PROVIDER_NAME: Record<ProviderId | 'manual', string> = { claude: 'Claude', gemini: 'Gemini', groq: 'Groq', manual: 'Copiar y pegar' };

export interface StructuredReq<T> {
  system: string;
  user: string;
  parts?: AiPart[];
  schema: z.ZodType<T>;
  maxTokens: number;
  effort: 'low' | 'medium';
}

export interface TextReq {
  system: string;
  history: { role: 'user' | 'assistant'; text: string }[];
}

// ---------- Claude ----------

const CLAUDE_MODEL = 'claude-opus-5-5';

function claude(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

function toBlocks(parts: AiPart[]): Anthropic.Beta.BetaContentBlockParam[] {
  return parts.map((p): Anthropic.Beta.BetaContentBlockParam => {
    if (p.kind === 'pdf') return { type: 'document', title: p.name, source: { type: 'base64', media_type: 'application/pdf', data: p.base64 } };
    if (p.kind === 'image') return { type: 'image', source: { type: 'base64', media_type: p.mediaType, data: p.base64 } };
    return { type: 'text', text: `Fuente «${p.name}»:\n\n${p.text}` };
  });
}

function claudeError(e: unknown): Error {
  if (e instanceof Anthropic.AuthenticationError) return new AiError('la clave no es válida');
  if (e instanceof Anthropic.RateLimitError) return new AiError('demasiadas peticiones o sin saldo');
  if (e instanceof Anthropic.BadRequestError) return new AiError(`no ha aceptado la petición (${e.message})`);
  if (e instanceof Anthropic.APIConnectionError) return new AiError('sin conexión');
  if (e instanceof Anthropic.APIError) return new AiError(`error ${e.status}`);
  return e instanceof Error ? e : new Error(String(e));
}

async function claudeStructured<T>(key: string, r: StructuredReq<T>): Promise<T> {
  try {
    const res = await claude(key).beta.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: r.maxTokens,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: r.effort, format: betaZodOutputFormat(r.schema) },
      system: r.system,
      messages: [{ role: 'user', content: [...toBlocks(r.parts ?? []), { type: 'text', text: r.user }] }],
    });
    if (res.stop_reason === 'refusal' || !res.parsed_output) throw new AiRefusal('Claude no ha podido hacerlo.');
    return res.parsed_output as T;
  } catch (e) {
    throw e instanceof AiRefusal ? e : claudeError(e);
  }
}

async function claudeText(key: string, r: TextReq): Promise<string> {
  try {
    const res = await claude(key).beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: r.system,
      messages: r.history.map((m) => ({ role: m.role, content: m.text })),
    });
    if (res.stop_reason === 'refusal') throw new AiRefusal('Claude no puede responder a eso.');
    return res.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
  } catch (e) {
    throw e instanceof AiRefusal ? e : claudeError(e);
  }
}

// ---------- Gemini (gratis con clave de Google AI Studio) ----------

// Los alias por si no se puede leer la lista de modelos. Flash-Lite va primero:
// en el plan gratis tiene muchos más usos al día y responde más rápido.
const GEMINI_FALLBACK = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
const GEMINI = 'https://generativelanguage.googleapis.com/v1beta';

async function httpError(res: Response): Promise<AiError> {
  let detail = '';
  try {
    const body = await res.json();
    detail = body?.error?.message ?? '';
  } catch {
    // sin cuerpo JSON
  }
  if (res.status === 429) return new AiError('se ha acabado el uso gratis por ahora (vuelve a probar en un rato o mañana)');
  if (res.status === 401 || res.status === 403 || /api key/i.test(detail)) return new AiError('la clave no es válida');
  return new AiError(`error ${res.status}${detail ? `: ${detail.slice(0, 140)}` : ''}`);
}

/** fetch con tiempo máximo, para que nada se quede colgado. */
async function call(url: string, init: RequestInit, seconds: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), seconds * 1000);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch {
    throw new AiError(ctrl.signal.aborted ? `no ha respondido en ${seconds} s` : 'sin conexión');
  } finally {
    clearTimeout(t);
  }
}

function post(url: string, headers: Record<string, string>, body: unknown, seconds = 120): Promise<Response> {
  return call(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }, seconds);
}

/** Ordena los modelos Flash estables por versión: el Flash-Lite más nuevo primero y luego el Flash más nuevo. */
export function pickGeminiModels(names: string[]): string[] {
  const parsed = names
    .map((n) => n.replace(/^models\//, '').match(/^gemini-(\d+(?:\.\d+)?)-flash(-lite)?$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ id: m[0], v: Number(m[1]), lite: !!m[2] }))
    .sort((x, y) => y.v - x.v);
  const lite = parsed.filter((m) => m.lite).slice(0, 2).map((m) => m.id);
  const flash = parsed.filter((m) => !m.lite).slice(0, 1).map((m) => m.id);
  return [...new Set([...lite, ...flash, ...GEMINI_FALLBACK])];
}

const modelCache = new Map<string, Promise<string[]>>();

/** Pregunta a Google qué modelos puede usar esta clave (los retiran y cambian a menudo). */
function geminiModels(key: string): Promise<string[]> {
  let p = modelCache.get(key);
  if (!p) {
    p = call(`${GEMINI}/models?pageSize=1000`, { headers: { 'x-goog-api-key': key } }, 15)
      .then(async (res) => {
        if (!res.ok) throw await httpError(res);
        const data = await res.json();
        return pickGeminiModels(
          (data?.models ?? [])
            .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: { name: string }) => m.name),
        );
      })
      .catch((e) => {
        modelCache.delete(key);
        if (e instanceof AiError && /clave/.test(e.message)) throw e;
        return GEMINI_FALLBACK;
      });
    modelCache.set(key, p);
  }
  return p;
}

/** Claves cuyo Gemini no acepta el esquema JSON (se piden sin él). */
const noSchema = new Set<string>();

/** json: false = texto libre; true = JSON; un esquema = JSON que Gemini obliga a cumplir. */
async function gemini(key: string, system: string, contents: unknown[], json: boolean | object, seconds = 120): Promise<string> {
  let last: Error = new AiError('sin modelo disponible');
  for (const model of await geminiModels(key)) {
    const config = (withSchema: boolean) =>
      json
        ? { responseMimeType: 'application/json', ...(withSchema && typeof json === 'object' ? { responseJsonSchema: json } : {}) }
        : {};
    const send = (withSchema: boolean) =>
      post(`${GEMINI}/models/${model}:generateContent`, { 'x-goog-api-key': key }, { systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: config(withSchema) }, seconds);
    const useSchema = typeof json === 'object' && !noSchema.has(key);
    let res = await send(useSchema);
    if (useSchema && res.status === 400) {
      // Algún modelo no acepta el esquema: se pide solo JSON y lo valida la app.
      noSchema.add(key);
      res = await send(false);
    }
    if (res.status === 404 || res.status === 429 || res.status === 503) {
      // Modelo retirado, sin cuota o saturado: la cuota es por modelo, así que probamos otro.
      last = await httpError(res);
      continue;
    }
    if (!res.ok) throw await httpError(res);
    const data = await res.json();
    if (data?.promptFeedback?.blockReason) throw new AiRefusal('Gemini no ha querido responder a eso.');
    const cand = data?.candidates?.[0];
    const text = (cand?.content?.parts ?? []).map((p: { text?: string; thought?: boolean }) => (p.thought ? '' : (p.text ?? ''))).join('');
    if (!text.trim()) throw cand?.finishReason === 'SAFETY' ? new AiRefusal('Gemini no ha querido responder a eso.') : new AiError('respuesta vacía');
    return text;
  }
  throw last;
}

function geminiParts(parts: AiPart[], user: string): unknown[] {
  return [
    ...parts.map((p) =>
      p.kind === 'text' ? { text: `Fuente «${p.name}»:\n\n${p.text}` } : { inlineData: { mimeType: p.kind === 'pdf' ? 'application/pdf' : p.mediaType, data: p.base64 } },
    ),
    { text: user },
  ];
}

// ---------- Groq (gratis, muchos usos al día, solo texto) ----------

const GROQ_MODELS = ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b'];

async function groq(key: string, messages: { role: string; content: string }[], json: boolean, seconds = 120): Promise<string> {
  let last: Error = new AiError('sin modelo disponible');
  for (const model of GROQ_MODELS) {
    const res = await post('https://api.groq.com/openai/v1/chat/completions', { authorization: `Bearer ${key}` }, {
      model,
      messages,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
      ...(model.startsWith('openai/') ? { reasoning_effort: 'low' } : {}),
    }, seconds);
    if (res.status === 404 || res.status === 400 || res.status === 429) {
      // Modelo retirado del plan gratis, que no acepta algún parámetro o sin cuota (es por modelo): probamos el siguiente.
      last = await httpError(res);
      continue;
    }
    if (!res.ok) throw await httpError(res);
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? '';
    if (!text.trim()) throw new AiError('respuesta vacía');
    return text;
  }
  throw last;
}

// ---------- JSON para los modelos sin salida estructurada ----------

function jsonInstructions(schema: z.ZodType): string {
  return (
    '\n\nResponde SOLO con un objeto JSON válido, sin texto antes ni después, que cumpla este esquema JSON ' +
    '(las "description" explican qué poner en cada campo):\n' +
    JSON.stringify(z.toJSONSchema(schema))
  );
}

/**
 * Pide JSON y lo valida. Antes de rechazarlo intenta arreglarlo (campos que faltan, tipos)
 * y quitar los elementos sueltos que no valgan; si aun así no cumple, lo pide otra vez explicando el fallo.
 */
async function viaJson<T>(schema: z.ZodType<T>, ask: (fix: string) => Promise<string>): Promise<T> {
  const js = z.toJSONSchema(schema);
  let fix = '';
  let why = 'la respuesta no tenía el formato esperado';
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await ask(fix);
    let data: unknown;
    try {
      data = repairJson(extractJson(raw), js);
    } catch {
      fix = '\n\nTu respuesta anterior no era JSON válido o estaba cortada. Devuelve solo el objeto JSON completo, más breve si hace falta.';
      why = 'la respuesta llegó cortada o no era JSON';
      continue;
    }
    let ok = schema.safeParse(data);
    for (let k = 0; !ok.success && k < 5 && pruneInvalid(data, ok.error.issues.map((i) => i.path)); k++) ok = schema.safeParse(data);
    if (ok.success) return ok.data;
    const issues = ok.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`);
    fix = `\n\nTu respuesta anterior no cumplía el esquema: ${issues.join('; ')}. Corrígelo y devuelve solo el objeto JSON.`;
    why = `la respuesta no tenía el formato esperado (${issues[0]})`;
  }
  throw new AiError(why);
}

// ---------- Copiar y pegar ----------

function manualPrompt(system: string, body: string): string {
  return `${system}\n\n${body}`;
}

// ---------- Orden y respaldo ----------

export function providers(keys: AiKeys): ProviderId[] {
  const out: ProviderId[] = [];
  if (keys.apiKey?.trim()) out.push('claude');
  if (keys.geminiKey?.trim()) out.push('gemini');
  if (keys.groqKey?.trim()) out.push('groq');
  return out;
}

function hasFiles(parts?: AiPart[]): boolean {
  return (parts ?? []).some((p) => p.kind !== 'text');
}

async function structuredWith<T>(id: ProviderId, keys: AiKeys, r: StructuredReq<T>): Promise<T> {
  if (id === 'claude') return claudeStructured(keys.apiKey.trim(), r);
  const sys = r.system + jsonInstructions(r.schema);
  if (id === 'gemini')
    return viaJson(r.schema, (fix) => gemini(keys.geminiKey!.trim(), sys, [{ role: 'user', parts: geminiParts(r.parts ?? [], r.user + fix) }], compactSchema(z.toJSONSchema(r.schema))));
  const sources = (r.parts ?? []).map((p) => (p.kind === 'text' ? `Fuente «${p.name}»:\n\n${p.text}\n\n` : '')).join('');
  return viaJson(r.schema, (fix) =>
    groq(keys.groqKey!.trim(), [
      { role: 'system', content: sys },
      { role: 'user', content: sources + r.user + fix },
    ], true),
  );
}

async function textWith(id: ProviderId, keys: AiKeys, r: TextReq): Promise<string> {
  if (id === 'claude') return claudeText(keys.apiKey.trim(), r);
  if (id === 'gemini')
    return gemini(keys.geminiKey!.trim(), r.system, r.history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] })), false);
  return groq(keys.groqKey!.trim(), [{ role: 'system', content: r.system }, ...r.history.map((m) => ({ role: m.role, content: m.text }))], false);
}

function failures(errs: string[]): string {
  return errs.length ? ` (${errs.join(' · ')})` : '';
}

/** Pide una respuesta con forma fija probando cada IA disponible y, al final, copiar y pegar. */
export async function structured<T>(keys: AiKeys, r: StructuredReq<T>): Promise<T> {
  const errs: string[] = [];
  for (const id of providers(keys)) {
    if (id === 'groq' && hasFiles(r.parts)) continue; // Groq no lee PDF ni fotos.
    try {
      return await structuredWith(id, keys, r);
    } catch (e) {
      if (e instanceof AiRefusal) throw e;
      errs.push(`${PROVIDER_NAME[id]}: ${e instanceof Error ? e.message : 'error'}`);
    }
  }
  const files = (r.parts ?? []).filter((p) => p.kind !== 'text').map((p) => p.name);
  const sources = (r.parts ?? []).map((p) => (p.kind === 'text' ? `Fuente «${p.name}»:\n\n${p.text}\n\n` : '')).join('');
  try {
    return await viaJson(r.schema, (fix) => askManual(manualPrompt(r.system + jsonInstructions(r.schema), sources + r.user + fix), files, true, errs));
  } catch (e) {
    if (e instanceof AiCancelled) throw new AiError(`Cancelado${failures(errs)}.`);
    throw e;
  }
}

/** Respuesta libre (chat) con el mismo orden de respaldo. */
export async function text(keys: AiKeys, r: TextReq): Promise<string> {
  const errs: string[] = [];
  for (const id of providers(keys)) {
    try {
      return await textWith(id, keys, r);
    } catch (e) {
      if (e instanceof AiRefusal) throw e;
      errs.push(`${PROVIDER_NAME[id]}: ${e instanceof Error ? e.message : 'error'}`);
    }
  }
  const convo = r.history.map((m) => `${m.role === 'user' ? 'ALUMNO' : 'ASISTENTE'}: ${m.text}`).join('\n\n');
  try {
    return (await askManual(manualPrompt(r.system, `Conversación hasta ahora:\n\n${convo}\n\nResponde al último mensaje del alumno.`), [], false, errs)).trim();
  } catch (e) {
    if (e instanceof AiCancelled) throw new AiError(`Cancelado${failures(errs)}.`);
    throw e;
  }
}

/** Prueba una clave concreta con una pregunta mínima (como mucho 30 s). */
export async function testProvider(id: ProviderId, keys: AiKeys): Promise<string> {
  const system = 'Responde en español con una sola frase corta.';
  const ask = 'Saluda al alumno de Tidepopper.';
  if (id === 'gemini') return gemini(keys.geminiKey!.trim(), system, [{ role: 'user', parts: [{ text: ask }] }], false, 30);
  if (id === 'groq') return groq(keys.groqKey!.trim(), [{ role: 'system', content: system }, { role: 'user', content: ask }], false, 30);
  return claudeText(keys.apiKey.trim(), { system, history: [{ role: 'user', text: ask }] });
}

export function describeAiError(e: unknown): string {
  if (e instanceof AiRefusal || e instanceof AiError) return e.message.charAt(0).toUpperCase() + e.message.slice(1);
  return 'Algo ha fallado al hablar con la IA.';
}
