// Pódcast interactivo: estilos, presentadores, preguntas que lo pausan y trozos de audio.
import type { Podcast, PodcastLine, PodcastStyle } from '../data/types';

export interface StyleInfo {
  label: string;
  emoji: string;
  text: string;
  hosts: [string, string];
  /** Cómo es cada presentador (para el guion). */
  roles: [string, string];
  /** Voces de Gemini que mejor les van. */
  voices: [string, string];
}

export const STYLES: Record<PodcastStyle, StyleInfo> = {
  charla: { label: 'Charla', emoji: '☕', text: 'Dos amigos lo comentan', hosts: ['Alex', 'Sara'], roles: ['curioso, hace preguntas y pone ejemplos', 'experta y cercana, lo explica con claridad'], voices: ['Puck', 'Kore'] },
  clase: { label: 'Clase', emoji: '🎓', text: 'Profesora y alumno', hosts: ['Leo', 'Marta'], roles: ['alumno que pregunta lo que no entiende y se equivoca a veces', 'profesora paciente que explica paso a paso'], voices: ['Fenrir', 'Sulafat'] },
  debate: { label: 'Debate', emoji: '⚖️', text: 'Dos puntos de vista', hosts: ['Iván', 'Nora'], roles: ['defiende un enfoque y busca los puntos débiles', 'defiende el otro enfoque y aporta datos'], voices: ['Charon', 'Leda'] },
  entrevista: { label: 'Entrevista', emoji: '🎤', text: 'Con una experta invitada', hosts: ['Dani', 'Dra. Vega'], roles: ['presentador que entrevista y resume', 'experta invitada que responde con detalle y anécdotas'], voices: ['Achird', 'Gacrux'] },
};

/** Voces de Gemini (texto a voz) con su carácter. */
export const GEMINI_VOICES: { name: string; text: string }[] = [
  { name: 'Puck', text: 'Animada' },
  { name: 'Kore', text: 'Firme' },
  { name: 'Zephyr', text: 'Brillante' },
  { name: 'Charon', text: 'Informativa' },
  { name: 'Fenrir', text: 'Entusiasta' },
  { name: 'Leda', text: 'Juvenil' },
  { name: 'Aoede', text: 'Ligera' },
  { name: 'Orus', text: 'Firme' },
  { name: 'Callirrhoe', text: 'Tranquila' },
  { name: 'Autonoe', text: 'Brillante' },
  { name: 'Enceladus', text: 'Susurrante' },
  { name: 'Iapetus', text: 'Clara' },
  { name: 'Umbriel', text: 'Relajada' },
  { name: 'Algieba', text: 'Suave' },
  { name: 'Despina', text: 'Suave' },
  { name: 'Erinome', text: 'Clara' },
  { name: 'Algenib', text: 'Grave' },
  { name: 'Rasalgethi', text: 'Informativa' },
  { name: 'Laomedeia', text: 'Animada' },
  { name: 'Achernar', text: 'Dulce' },
  { name: 'Alnilam', text: 'Firme' },
  { name: 'Schedar', text: 'Serena' },
  { name: 'Gacrux', text: 'Madura' },
  { name: 'Pulcherrima', text: 'Directa' },
  { name: 'Achird', text: 'Amable' },
  { name: 'Zubenelgenubi', text: 'Informal' },
  { name: 'Vindemiatrix', text: 'Delicada' },
  { name: 'Sadachbia', text: 'Viva' },
  { name: 'Sadaltager', text: 'Sabia' },
  { name: 'Sulafat', text: 'Cálida' },
];

export function hostsOf(p: Podcast): [string, string] {
  return p.hosts ?? STYLES[p.style ?? 'charla'].hosts;
}

export function isQuestion(l: PodcastLine): boolean {
  return (l.options?.length ?? 0) >= 2 && typeof l.answer === 'number' && l.answer >= 0 && l.answer < l.options!.length;
}

/** Lo que dice el otro presentador después de que respondas. */
export function feedbackText(l: PodcastLine, ok: boolean, rnd: () => number = Math.random): string {
  const yes = ['¡Exacto!', '¡Muy bien!', '¡Correcto!', '¡Eso es!'];
  const no = ['Casi, pero no.', 'Uy, no era esa.', 'No exactamente.'];
  const start = ok ? yes[Math.floor(rnd() * yes.length)] : `${no[Math.floor(rnd() * no.length)]} La respuesta era: ${l.options![l.answer!]}.`;
  return `${start} ${l.explanation ?? ''}`.trim();
}

/**
 * Trozos de audio para las voces de Gemini: intervenciones seguidas hasta una pregunta
 * (que cierra su trozo, porque ahí se pausa) o hasta ~1.400 caracteres.
 */
export function segments(lines: PodcastLine[], maxChars = 1400): number[][] {
  const out: number[][] = [];
  let cur: number[] = [];
  let len = 0;
  lines.forEach((l, i) => {
    if (cur.length && len + l.text.length > maxChars) {
      out.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(i);
    len += l.text.length;
    if (isQuestion(l)) {
      out.push(cur);
      cur = [];
      len = 0;
    }
  });
  if (cur.length) out.push(cur);
  return out;
}

/** Audio PCM de 16 bits (lo que devuelve Gemini) → archivo WAV reproducible. */
export function pcmToWav(pcm: Uint8Array, sampleRate = 24000, channels = 1): Blob {
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + pcm.length, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, channels, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * channels * 2, true);
  v.setUint16(32, channels * 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, pcm.length, true);
  return new Blob([header, pcm], { type: 'audio/wav' });
}

/** Qué intervención suena en un momento del trozo, repartiendo el tiempo según lo largo de cada texto. */
export function lineAtTime(lines: PodcastLine[], idx: number[], t: number, duration: number): number {
  const total = idx.reduce((a, i) => a + lines[i].text.length, 0) || 1;
  let acc = 0;
  for (const i of idx) {
    acc += lines[i].text.length;
    if (t <= (acc / total) * duration) return i;
  }
  return idx[idx.length - 1];
}
