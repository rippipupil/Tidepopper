// Voz del pódcast: la del propio dispositivo (gratis, sin límites y sin internet).
// En el APK usa el motor de voz de Android; en la web, el del navegador.
import { TextToSpeech } from '@capacitor-community/text-to-speech';

let voices: Promise<number[]> | null = null;

/** Índices de dos voces en español (si las hay) para los dos presentadores. */
function spanishVoices(): Promise<number[]> {
  if (!voices)
    voices = TextToSpeech.getSupportedVoices()
      .then(({ voices: list }) => {
        const es = list.map((v, i) => ({ v, i })).filter(({ v }) => /^es([-_]|$)/i.test(v.lang));
        const spain = es.filter(({ v }) => /es[-_]ES/i.test(v.lang));
        const pick = (spain.length >= 2 ? spain : es).map(({ i }) => i);
        return pick.slice(0, 2);
      })
      .catch(() => []);
  return voices;
}

/** Lee una frase con la voz del presentador (0 o 1). Se resuelve al terminar. */
export async function speak(text: string, host: 0 | 1, rate: number): Promise<void> {
  const v = await spanishVoices();
  const voice = v.length >= 2 ? v[host] : v[0];
  await TextToSpeech.speak({
    text,
    lang: 'es-ES',
    rate,
    // Con una sola voz, el tono distingue a los dos presentadores.
    pitch: v.length >= 2 ? 1 : host === 0 ? 0.9 : 1.2,
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
