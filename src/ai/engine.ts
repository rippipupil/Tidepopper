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
  | { kind: 'image'; name: string; base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' }
  /** Audio o vídeo (solo lo entiende Gemini): en línea, subido a Gemini (uri) o un enlace de YouTube. */
  | { kind: 'media'; name: string; mediaType: string; base64?: string; uri?: string };

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
  return parts.filter((p) => p.kind !== 'media').map((p): Anthropic.Beta.BetaContentBlockParam => {
    if (p.kind === 'pdf') return { type: 'document', title: p.name, source: { type: 'base64', media_type: 'application/pdf', data: p.base64 } };
    if (p.kind === 'image') return { type: 'image', source: { type: 'base64', media_type: p.mediaType, data: p.base64 } };
    return { type: 'text', text: `Fuente «${p.name}»:\n\n${(p as { text: string }).text}` };
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

const listCache = new Map<string, Promise<string[] | null>>();

/** Nombres de los modelos que puede usar esta clave (null si no se ha podido leer la lista). */
function listGemini(key: string): Promise<string[] | null> {
  let p = listCache.get(key);
  if (!p) {
    p = call(`${GEMINI}/models?pageSize=1000`, { headers: { 'x-goog-api-key': key } }, 15)
      .then(async (res) => {
        if (!res.ok) throw await httpError(res);
        const data = await res.json();
        return (data?.models ?? [])
          .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: { name: string }) => m.name.replace(/^models\//, '')) as string[];
      })
      .catch((e) => {
        listCache.delete(key);
        if (e instanceof AiError && /clave/.test(e.message)) throw e;
        return null;
      });
    listCache.set(key, p);
  }
  return p;
}

/** Pregunta a Google qué modelos puede usar esta clave (los retiran y cambian a menudo). */
async function geminiModels(key: string): Promise<string[]> {
  const names = await listGemini(key);
  return names ? pickGeminiModels(names) : GEMINI_FALLBACK;
}

/** Modelos de voz (texto a voz) de Gemini: los Flash más nuevos primero. */
export function pickTtsModels(names: string[]): string[] {
  const version = (n: string) => Number(/gemini-(\d+(?:\.\d+)?)/.exec(n)?.[1] ?? 0);
  const tts = names.filter((n) => /tts/i.test(n)).sort((a, b) => Number(/pro/.test(a)) - Number(/pro/.test(b)) || version(b) - version(a));
  return [...new Set([...tts, 'gemini-2.5-flash-preview-tts'])];
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
    ...parts.map((p) => {
      if (p.kind === 'text') return { text: `Fuente «${p.name}»:\n\n${p.text}` };
      if (p.kind === 'media') return p.uri ? { fileData: { fileUri: p.uri, ...(p.mediaType ? { mimeType: p.mediaType } : {}) } } : { inlineData: { mimeType: p.mediaType, data: p.base64 } };
      return { inlineData: { mimeType: p.kind === 'pdf' ? 'application/pdf' : p.mediaType, data: p.base64 } };
    }),
    { text: user },
  ];
}

/**
 * Sube un archivo grande (audio, vídeo) a Gemini y espera a que esté listo.
 * Devuelve su uri para usarlo en las peticiones. Los archivos se borran solos a las 48 h.
 */
export async function geminiUpload(key: string, blob: Blob, name: string, mediaType: string): Promise<string> {
  const boundary = `tidepopper${Math.random().toString(36).slice(2)}`;
  const meta = JSON.stringify({ file: { display_name: name.slice(0, 120) } });
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mediaType}\r\n\r\n`,
    blob,
    `\r\n--${boundary}--\r\n`,
  ]);
  const res = await call(`https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'content-type': `multipart/related; boundary=${boundary}` },
    body,
  }, 600);
  if (!res.ok) throw await httpError(res);
  let file = (await res.json())?.file;
  for (let k = 0; file && file.state === 'PROCESSING' && k < 120; k++) {
    await new Promise((r) => setTimeout(r, 3000));
    const st = await call(`${GEMINI}/${file.name}`, { headers: { 'x-goog-api-key': key } }, 30);
    if (!st.ok) throw await httpError(st);
    file = await st.json();
  }
  if (!file?.uri || file.state === 'FAILED') throw new AiError('Gemini no ha podido procesar el archivo');
  return file.uri as string;
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

function hasMedia(parts?: AiPart[]): boolean {
  return (parts ?? []).some((p) => p.kind === 'media');
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
    if (id === 'claude' && hasMedia(r.parts)) continue; // Claude no escucha audio ni ve vídeos.
    try {
      return await structuredWith(id, keys, r);
    } catch (e) {
      if (e instanceof AiRefusal) throw e;
      errs.push(`${PROVIDER_NAME[id]}: ${e instanceof Error ? e.message : 'error'}`);
    }
  }
  if (hasMedia(r.parts)) throw new AiError(`Para audio, vídeo o YouTube hace falta una clave gratis de Gemini (Ajustes)${failures(errs)}`);
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
  if (e instanceof Error && e.message) return `Algo ha fallado: ${e.message}`;
  return 'Algo ha fallado al hablar con la IA.';
}

// ---------- Transcribir audio y vídeo ----------

const INLINE_MAX = 14 * 1024 * 1024; // Gemini acepta ~20 MB por petición (el base64 ocupa un tercio más)

async function blobBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

const TRANSCRIBE =
  'Transcribe el audio completo, palabra por palabra, en su idioma original. Separa en párrafos cuando cambie la idea. ' +
  'Si hay varias personas, empieza cada intervención con «— ». No resumas ni comentes nada: devuelve solo la transcripción.';

/** Pasa a texto una grabación o un archivo de audio/vídeo. Gemini (gratis) primero; si no, Whisper de Groq (gratis, ≤ 25 MB). */
export async function transcribe(keys: AiKeys, blob: Blob, name: string, onStatus?: (s: string) => void): Promise<string> {
  const errs: string[] = [];
  const mediaType = (blob.type || 'audio/webm').split(';')[0];
  const gKey = keys.geminiKey?.trim();
  if (gKey) {
    try {
      let part: AiPart;
      if (blob.size <= INLINE_MAX) part = { kind: 'media', name, mediaType, base64: await blobBase64(blob) };
      else {
        onStatus?.('Subiendo el archivo…');
        part = { kind: 'media', name, mediaType, uri: await geminiUpload(gKey, blob, name, mediaType) };
      }
      onStatus?.('Transcribiendo…');
      return (await gemini(gKey, TRANSCRIBE, [{ role: 'user', parts: geminiParts([part], 'Transcribe este audio.') }], false, 600)).trim();
    } catch (e) {
      errs.push(`Gemini: ${e instanceof Error ? e.message : 'error'}`);
    }
  }
  const qKey = keys.groqKey?.trim();
  if (qKey && blob.size <= 25 * 1024 * 1024) {
    try {
      onStatus?.('Transcribiendo…');
      const form = new FormData();
      form.append('file', blob, name.includes('.') ? name : `${name}.webm`);
      form.append('model', 'whisper-large-v3-turbo');
      form.append('response_format', 'text');
      const res = await call('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { authorization: `Bearer ${qKey}` }, body: form }, 600);
      if (!res.ok) throw await httpError(res);
      return (await res.text()).trim();
    } catch (e) {
      errs.push(`Groq: ${e instanceof Error ? e.message : 'error'}`);
    }
  }
  if (!gKey && !qKey) throw new AiError('Para pasar audio a texto hace falta una clave gratis de Gemini o Groq (en Ajustes)');
  throw new AiError(`No se ha podido transcribir${failures(errs)}`);
}

/** Saca el contenido de un vídeo de YouTube (solo Gemini sabe verlos). */
export async function youtubeText(keys: AiKeys, url: string): Promise<string> {
  const gKey = keys.geminiKey?.trim();
  if (!gKey) throw new AiError('Para usar vídeos de YouTube hace falta una clave gratis de Gemini (en Ajustes)');
  const part: AiPart = { kind: 'media', name: 'YouTube', mediaType: '', uri: url };
  const prompt =
    'Escribe una transcripción lo más completa posible de este vídeo, en su idioma original. Si no puedes transcribir literalmente, ' +
    'reproduce con mucho detalle todo lo que se explica, en orden, con los ejemplos, datos y fórmulas que aparezcan. Solo el contenido, sin comentarios.';
  return (await gemini(gKey, prompt, [{ role: 'user', parts: geminiParts([part], 'Este es el vídeo.') }], false, 600)).trim();
}

// ---------- Voces realistas de Gemini (texto a voz) ----------

/**
 * Lee un trozo de pódcast con voces de Gemini (como mucho dos presentadores por petición).
 * Devuelve el audio en WAV.
 */
export async function geminiSpeech(keys: AiKeys, lines: { speaker: string; text: string }[], voices: Record<string, string>): Promise<Blob> {
  const key = keys.geminiKey?.trim();
  if (!key) throw new AiError('Las voces realistas necesitan la clave gratis de Gemini (en Ajustes)');
  const { pcmToWav } = await import('../logic/podcast');
  const speakers = [...new Set(lines.map((l) => l.speaker))];
  const speechConfig =
    speakers.length >= 2
      ? { multiSpeakerVoiceConfig: { speakerVoiceConfigs: speakers.slice(0, 2).map((sp) => ({ speaker: sp, voiceConfig: { prebuiltVoiceConfig: { voiceName: voices[sp] ?? 'Puck' } } })) } }
      : { voiceConfig: { prebuiltVoiceConfig: { voiceName: voices[speakers[0]] ?? 'Puck' } } };
  const text =
    speakers.length >= 2
      ? `Lee esta conversación de un pódcast educativo en español de España, con naturalidad, ritmo animado y cercano:\n\n${lines.map((l) => `${l.speaker}: ${l.text}`).join('\n')}`
      : `Lee en español de España, con naturalidad y tono cercano: ${lines.map((l) => l.text).join(' ')}`;
  let last: Error = new AiError('no hay ningún modelo de voz disponible');
  for (const model of pickTtsModels((await listGemini(key)) ?? [])) {
    const res = await post(`${GEMINI}/models/${model}:generateContent`, { 'x-goog-api-key': key }, {
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig },
    }, 180);
    if (res.status === 404 || res.status === 429 || res.status === 503 || res.status === 400) {
      last = await httpError(res);
      continue;
    }
    if (!res.ok) throw await httpError(res);
    const data = await res.json();
    const part = (data?.candidates?.[0]?.content?.parts ?? []).find((p: { inlineData?: { data?: string } }) => p.inlineData?.data);
    if (!part) throw new AiError('Gemini no ha devuelto audio');
    const mime: string = part.inlineData.mimeType ?? '';
    const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000);
    const bin = atob(part.inlineData.data);
    const pcm = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) pcm[i] = bin.charCodeAt(i);
    return /wav|mpeg|mp3|ogg/.test(mime) ? new Blob([pcm], { type: mime }) : pcmToWav(pcm, rate);
  }
  throw last;
}
