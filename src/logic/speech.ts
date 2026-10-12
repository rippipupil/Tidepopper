// Voz del pódcast con el motor del dispositivo (gratis, sin límites y sin internet).
// En el APK usa el motor de voz de Android; en la web, el del navegador.
import { TextToSpeech } from '@capacitor-community/text-to-speech';

export interface DeviceVoice {
  index: number;
  name: string;
  lang: string;
}

let cache: Promise<DeviceVoice[]> | null = null;

/** Voces del dispositivo en español (de España primero), o todas si no hay ninguna en español. */
export function deviceVoices(): Promise<DeviceVoice[]> {
  if (!cache)
    cache = TextToSpeech.getSupportedVoices()
      .then(({ voices }) => {
        const all = voices.map((v, index) => ({ index, name: v.name || v.voiceURI || `Voz ${index + 1}`, lang: v.lang || '' }));
        const es = all.filter((v) => /^es([-_]|$)/i.test(v.lang));
        const rank = (v: DeviceVoice) => (/es[-_]ES/i.test(v.lang) ? 0 : 1);
        return (es.length ? es : all).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
      })
      .catch(() => []);
  return cache;
}

/** Voz de cada presentador: la elegida o, si no, dos voces distintas en español. */
export async function hostVoices(chosen: [number | null, number | null]): Promise<[number | undefined, number | undefined]> {
  const list = await deviceVoices();
  const auto0 = list[0]?.index;
  const auto1 = list.find((v) => v.index !== (chosen[0] ?? auto0))?.index ?? auto0;
  return [chosen[0] ?? auto0, chosen[1] ?? auto1];
}

/**
 * Lee una frase con la voz del presentador (0 o 1). Cada presentador tiene su tono,
 * y las preguntas suenan algo más agudas y pausadas. Se resuelve al terminar.
 */
export async function speak(text: string, host: 0 | 1, rate: number, chosen: [number | null, number | null] = [null, null], question = false): Promise<void> {
  const voices = await hostVoices(chosen);
  const voice = voices[host];
  const sameVoice = voices[0] === voices[1];
  const basePitch = sameVoice ? (host === 0 ? 0.86 : 1.22) : host === 0 ? 0.96 : 1.06;
  await TextToSpeech.speak({
    text,
    lang: 'es-ES',
    rate: question ? rate * 0.95 : rate,
    pitch: question ? basePitch + 0.06 : basePitch,
    volume: 1,
    ...(voice !== undefined ? { voice } : {}),
    category: 'playback',
  });
}

export function stopSpeaking(): Promise<void> {
  return TextToSpeech.stop().catch(() => undefined);
}

/** Duración aproximada (segundos) a velocidad normal. */
export function estimateSeconds(texts: string[]): number {
  const words = texts.join(' ').split(/\s+/).filter(Boolean).length;
  return Math.round((words / 155) * 60);
}
