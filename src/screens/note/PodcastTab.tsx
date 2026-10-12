import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RefreshCw, SkipBack, SkipForward, Sparkles } from 'lucide-react';
import { useApp } from '../../data/store';
import { setSettings, updateNote } from '../../data/actions';
import { estimateSeconds, speak, stopSpeaking } from '../../logic/speech';
import type { Note, PodcastLength } from '../../data/types';
import { Loading } from '../../components/ui';

const LENGTHS: { id: PodcastLength; label: string; text: string }[] = [
  { id: 'corto', label: 'Rápido', text: '~3 min' },
  { id: 'medio', label: 'Normal', text: '~6 min' },
  { id: 'largo', label: 'A fondo', text: '~10 min' },
];
const HOSTS = ['Alex', 'Sara'];
const RATES = [0.8, 1, 1.25, 1.5, 2];
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export default function PodcastTab({ note }: { note: Note }) {
  const { state, update } = useApp();
  const pod = note.podcast;
  const [length, setLength] = useState<PodcastLength>(pod?.length ?? 'medio');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const token = useRef(0);
  const rate = state.settings.podcastRate || 1;
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Al salir de la pestaña, se para la voz.
  useEffect(
    () => () => {
      token.current++;
      void stopSpeaking();
    },
    [],
  );

  useEffect(() => {
    if (playing) lineRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [idx, playing]);

  const playFrom = async (from: number, r = rate) => {
    if (!pod) return;
    const my = ++token.current;
    await stopSpeaking();
    setPlaying(true);
    for (let i = from; i < pod.lines.length; i++) {
      if (token.current !== my) return;
      setIdx(i);
      try {
        await speak(pod.lines[i].text, pod.lines[i].host, r);
      } catch {
        if (token.current === my) setErr('Este dispositivo no puede leer en voz alta. Prueba en otro navegador o en la app.');
        break;
      }
    }
    if (token.current === my) {
      setPlaying(false);
      setIdx((i) => (i >= pod.lines.length - 1 ? 0 : i));
    }
  };

  const pause = async () => {
    token.current++;
    setPlaying(false);
    await stopSpeaking();
  };

  const make = async () => {
    await pause();
    setBusy(true);
    setErr('');
    try {
      const { generatePodcast } = await import('../../ai/tasks');
      const p = await generatePodcast(state.settings, note, length);
      const lines = p.lines.filter((l) => l.text.trim()).map((l) => ({ host: (l.host === 1 ? 1 : 0) as 0 | 1, text: l.text.trim() }));
      if (!lines.length) throw new Error('El guion llegó vacío. Prueba otra vez.');
      update((s) => updateNote(s, note.id, { podcast: { length, title: p.title, lines, createdAt: Date.now() } }));
      setIdx(0);
    } catch (e) {
      const { describeAiError } = await import('../../ai/tasks');
      setErr(describeAiError(e));
    } finally {
      setBusy(false);
    }
  };

  if (busy) return <Loading text="Alex y Sara están preparando el episodio…" />;

  if (!pod)
    return (
      <div className="col fadein" style={{ gap: 16 }}>
        <div className="cover">🎧</div>
        <div style={{ textAlign: 'center' }}>
          <h2>Escucha tus apuntes</h2>
          <p className="muted small" style={{ marginTop: 4 }}>
            Dos presentadores, Alex y Sara, te lo explican conversando. Perfecto para repasar andando o en el bus.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {LENGTHS.map((l) => (
            <button key={l.id} className="chip" aria-pressed={length === l.id} onClick={() => setLength(l.id)} style={{ flexDirection: 'column', gap: 2, padding: '10px 6px', borderRadius: 16 }}>
              <b style={{ fontSize: 14 }}>{l.label}</b>
              <span style={{ fontSize: 11 }}>{l.text}</span>
            </button>
          ))}
        </div>
        <button className="btn block" onClick={() => void make()}>
          <Sparkles size={18} /> Crear pódcast
        </button>
        {err && <div className="alert bad">{err}</div>}
      </div>
    );

  const total = estimateSeconds(pod.lines.map((l) => l.text)) / rate;
  const done = estimateSeconds(pod.lines.slice(0, idx).map((l) => l.text)) / rate;

  return (
    <div className="col fadein" style={{ gap: 16 }}>
      <div className="cover">🎙️</div>
      <div style={{ textAlign: 'center' }}>
        <h2>{pod.title}</h2>
        <p className="muted small">Con Alex y Sara · {LENGTHS.find((l) => l.id === pod.length)?.label}</p>
      </div>
      <div className="col" style={{ gap: 6 }}>
        <div className="bar">
          <span style={{ width: `${(100 * idx) / Math.max(1, pod.lines.length - 1)}%`, background: 'var(--accent)' }} />
        </div>
        <div className="row small faint">
          <span className="grow">{mmss(done)}</span>
          <span>{mmss(total)}</span>
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: 18 }}>
        <button className="iconbtn filled" aria-label="Anterior" onClick={() => void playFrom(Math.max(0, idx - 1))}>
          <SkipBack size={20} />
        </button>
        <button className="btn" style={{ width: 70, height: 70, borderRadius: 999, padding: 0 }} aria-label={playing ? 'Pausa' : 'Reproducir'} onClick={() => (playing ? void pause() : void playFrom(idx))}>
          {playing ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" />}
        </button>
        <button className="iconbtn filled" aria-label="Siguiente" onClick={() => void playFrom(Math.min(pod.lines.length - 1, idx + 1))}>
          <SkipForward size={20} />
        </button>
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
        <div className={`wave${playing ? '' : ' paused'}`} aria-hidden>
          <span /><span /><span /><span /><span />
        </div>
        {RATES.map((r) => (
          <button
            key={r}
            className="chip"
            aria-pressed={rate === r}
            onClick={() => {
              update((s) => setSettings(s, { podcastRate: r }));
              if (playing) void playFrom(idx, r);
            }}
          >
            {r}×
          </button>
        ))}
      </div>
      {err && <div className="alert bad">{err}</div>}

      <section className="card col" style={{ padding: 8, gap: 2 }}>
        {pod.lines.map((l, k) => (
          <div key={k} ref={(el) => (lineRefs.current[k] = el)} className={`line${k === idx ? ' now' : ''}`} onClick={() => void playFrom(k)}>
            <span className="who" style={{ color: l.host === 0 ? 'var(--accent)' : 'var(--violet)' }}>
              {HOSTS[l.host]}
            </span>
            <span style={{ fontSize: 15, lineHeight: 1.5 }}>{l.text}</span>
          </div>
        ))}
      </section>

      <div className="card pad col" style={{ gap: 10 }}>
        <span className="label">Crear otro episodio</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {LENGTHS.map((l) => (
            <button key={l.id} className="chip" aria-pressed={length === l.id} onClick={() => setLength(l.id)} style={{ justifyContent: 'center' }}>
              {l.label}
            </button>
          ))}
        </div>
        <button className="btn secondary" onClick={() => void make()}>
          <RefreshCw size={17} /> Rehacer pódcast
        </button>
      </div>
    </div>
  );
}
