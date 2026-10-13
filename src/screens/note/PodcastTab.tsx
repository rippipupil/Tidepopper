import { useEffect, useMemo, useRef, useState } from 'react';
import { del, get, keys as idbKeys, set } from 'idb-keyval';
import { Mic2, Pause, Play, RefreshCw, SkipBack, SkipForward, Sparkles, Volume2 } from 'lucide-react';
import { useApp } from '../../data/store';
import { setSettings, updateNote } from '../../data/actions';
import { deviceVoices, estimateSeconds, speak, stopSpeaking, type DeviceVoice } from '../../logic/speech';
import { feedbackText, GEMINI_VOICES, hostsOf, isQuestion, lineAtTime, segments, shuffleQuestions, STYLES } from '../../logic/podcast';
import type { Note, Podcast, PodcastLength, PodcastStyle, PodcastVoices } from '../../data/types';
import { Loading, Sheet, toast } from '../../components/ui';

const LENGTHS: { id: PodcastLength; label: string; text: string }[] = [
  { id: 'corto', label: 'Rápido', text: '~3 min' },
  { id: 'medio', label: 'Normal', text: '~6 min' },
  { id: 'largo', label: 'A fondo', text: '~10 min' },
];
const RATES = [0.8, 1, 1.25, 1.5, 2];
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const HOST_COLOR = ['var(--accent)', 'var(--violet)'];

export default function PodcastTab({ note }: { note: Note }) {
  const { state, update } = useApp();
  const pod = note.podcast;
  const [length, setLength] = useState<PodcastLength>(pod?.length ?? 'medio');
  const [style, setStyle] = useState<PodcastStyle>(pod?.style ?? 'charla');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [voicesOpen, setVoicesOpen] = useState(false);

  const make = async () => {
    setBusy(true);
    setErr('');
    try {
      const { generatePodcast } = await import('../../ai/tasks');
      const p = await generatePodcast(state.settings, note, length, style);
      const lines = shuffleQuestions(p.lines
        .filter((l) => l.text.trim())
        .map((l) => {
          const base = { host: (l.host === 1 ? 1 : 0) as 0 | 1, text: l.text.trim() };
          const q = { ...base, options: l.options.map((o) => o.trim()).filter(Boolean), answer: l.answer, explanation: l.explanation.trim() };
          return isQuestion(q) ? q : base;
        }));
      if (!lines.length) throw new Error('El guion llegó vacío. Prueba otra vez.');
      // El audio guardado del episodio anterior ya no sirve.
      for (const k of await idbKeys()) if (String(k).startsWith(`podaudio:${note.id}:`)) await del(k);
      const st = STYLES[style];
      update((s) => updateNote(s, note.id, { podcast: { length, style, hosts: st.hosts, title: p.title, lines, createdAt: Date.now() } }));
      // Al cambiar de estilo, las voces de Gemini pasan a las que mejor le van.
      update((s) => setSettings(s, { podcastVoices: { ...s.settings.podcastVoices, gemini: st.voices } }));
    } catch (e) {
      const { describeAiError } = await import('../../ai/tasks');
      setErr(describeAiError(e));
    } finally {
      setBusy(false);
    }
  };

  if (busy) return <Loading text="Preparando el episodio y sus preguntas…" />;

  const chooser = (
    <>
      <span className="label">Estilo</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {(Object.keys(STYLES) as PodcastStyle[]).map((k) => (
          <button key={k} className="chip" aria-pressed={style === k} onClick={() => setStyle(k)} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '10px 12px', borderRadius: 16, whiteSpace: 'normal', textAlign: 'left' }}>
            <b style={{ fontSize: 14 }}>
              {STYLES[k].emoji} {STYLES[k].label}
            </b>
            <span style={{ fontSize: 12 }}>
              {STYLES[k].text} · {STYLES[k].hosts.join(' y ')}
            </span>
          </button>
        ))}
      </div>
      <span className="label">Duración</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {LENGTHS.map((l) => (
          <button key={l.id} className="chip" aria-pressed={length === l.id} onClick={() => setLength(l.id)} style={{ flexDirection: 'column', gap: 2, padding: '10px 6px', borderRadius: 16 }}>
            <b style={{ fontSize: 14 }}>{l.label}</b>
            <span style={{ fontSize: 11 }}>{l.text}</span>
          </button>
        ))}
      </div>
    </>
  );

  if (!pod)
    return (
      <div className="col fadein" style={{ gap: 14 }}>
        <div className="cover">🎧</div>
        <div style={{ textAlign: 'center' }}>
          <h2>Escucha tus apuntes</h2>
          <p className="muted small" style={{ marginTop: 4 }}>
            Dos presentadores te lo explican conversando y, de vez en cuando, paran para hacerte una pregunta. Perfecto para repasar andando o en el bus.
          </p>
        </div>
        {chooser}
        <button className="btn block" onClick={() => void make()}>
          <Sparkles size={18} /> Crear pódcast
        </button>
        <button className="btn ghost sm" style={{ alignSelf: 'center' }} onClick={() => setVoicesOpen(true)}>
          <Mic2 size={15} /> Voces
        </button>
        {err && <div className="alert bad">{err}</div>}
        {voicesOpen && <VoicesSheet hosts={STYLES[style].hosts} onClose={() => setVoicesOpen(false)} />}
      </div>
    );

  return (
    <div className="col fadein" style={{ gap: 16 }}>
      <Player key={pod.createdAt} note={note} pod={pod} onVoices={() => setVoicesOpen(true)} />
      <div className="card pad col" style={{ gap: 10 }}>
        <span className="label">Crear otro episodio</span>
        {chooser}
        <button className="btn secondary" onClick={() => void make()}>
          <RefreshCw size={17} /> Rehacer pódcast
        </button>
        {err && <div className="alert bad">{err}</div>}
      </div>
      {voicesOpen && <VoicesSheet hosts={hostsOf(pod)} onClose={() => setVoicesOpen(false)} />}
    </div>
  );
}

// ---------- Reproductor ----------

function Player({ note, pod, onVoices }: { note: Note; pod: Podcast; onVoices: () => void }) {
  const { state, update } = useApp();
  const { podcastRate: rate = 1, podcastVoices: voices, podcastQuestions: questionsOn } = state.settings;
  const hosts = hostsOf(pod);
  const lines = pod.lines;
  const segs = useMemo(() => segments(lines), [lines]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ line: number; picked: number; ok: boolean } | null>(null);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const token = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const engine = useRef<PodcastVoices['engine']>(voices.engine);
  const audioCache = useRef(new Map<string, Promise<Blob>>());
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const questionRef = useRef<HTMLElement>(null);
  const questions = lines.map((l, i) => (isQuestion(l) ? i : -1)).filter((i) => i >= 0);
  const voiceKey = `${voices.gemini[0]}-${voices.gemini[1]}`;

  useEffect(() => {
    engine.current = voices.engine;
  }, [voices.engine]);

  useEffect(
    () => () => {
      token.current++;
      void stopSpeaking();
      audio.current?.pause();
    },
    [],
  );

  useEffect(() => {
    if (asking === null) lineRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [idx, asking]);

  // Cuando llega una pregunta: se ve en pantalla y el móvil vibra un poco.
  useEffect(() => {
    if (asking === null) return;
    questionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    navigator.vibrate?.(40);
  }, [asking]);

  useEffect(() => {
    if (audio.current) audio.current.playbackRate = rate;
  }, [rate]);

  const stopAll = () => {
    token.current++;
    void stopSpeaking();
    audio.current?.pause();
  };

  /** Audio de Gemini de un trozo (guardado en el dispositivo para no gastar peticiones). */
  const segAudio = (s: number): Promise<Blob> => {
    const key = `podaudio:${note.id}:${pod.createdAt}:${s}:${voiceKey}`;
    let p = audioCache.current.get(key);
    if (!p) {
      p = (async () => {
        const saved = await get<Blob>(key);
        if (saved) return saved;
        const { geminiSpeech } = await import('../../ai/engine');
        const blob = await geminiSpeech(
          state.settings,
          segs[s].map((i) => ({ speaker: hosts[lines[i].host], text: lines[i].text })),
          { [hosts[0]]: voices.gemini[0], [hosts[1]]: voices.gemini[1] },
        );
        await set(key, blob);
        return blob;
      })();
      p.catch(() => audioCache.current.delete(key));
      audioCache.current.set(key, p);
    }
    return p;
  };

  const askOrEnd = (k: number, my: number): boolean => {
    if (token.current !== my) return true;
    if (questionsOn && isQuestion(lines[k]) && !(k in answers)) {
      setIdx(k);
      setAsking(k);
      setPlaying(false);
      return true;
    }
    return false;
  };

  const deviceFrom = async (from: number, my: number) => {
    for (let k = from; k < lines.length; k++) {
      if (token.current !== my) return;
      setIdx(k);
      try {
        await speak(lines[k].text, lines[k].host, rate, voices.device, isQuestion(lines[k]));
      } catch {
        if (token.current === my) toast('Este dispositivo no puede leer en voz alta. Prueba las voces realistas de Gemini.');
        setPlaying(false);
        return;
      }
      if (askOrEnd(k, my)) return;
    }
    if (token.current === my) {
      setPlaying(false);
      setIdx(0);
    }
  };

  const playBlob = (blob: Blob, offsetFrac: number, idxs: number[], my: number) =>
    new Promise<boolean>((resolve) => {
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      audio.current = a;
      a.playbackRate = rate;
      const finish = (ended: boolean) => {
        URL.revokeObjectURL(url);
        a.ontimeupdate = a.onended = a.onerror = a.onpause = null;
        resolve(ended);
      };
      a.onloadedmetadata = () => {
        if (offsetFrac > 0 && Number.isFinite(a.duration)) a.currentTime = a.duration * offsetFrac;
      };
      a.ontimeupdate = () => {
        if (token.current !== my) return;
        if (Number.isFinite(a.duration)) setIdx(lineAtTime(lines, idxs, a.currentTime, a.duration));
      };
      a.onended = () => finish(true);
      a.onerror = () => finish(false);
      a.onpause = () => {
        if (!a.ended) finish(false);
      };
      a.play().catch(() => finish(false));
    });

  const geminiFrom = async (from: number, my: number) => {
    let s = segs.findIndex((g) => g.includes(from));
    for (; s >= 0 && s < segs.length; s++) {
      if (token.current !== my) return;
      let blob: Blob;
      try {
        setLoading(true);
        blob = await segAudio(s);
      } catch (e) {
        const { describeAiError } = await import('../../ai/engine');
        if (token.current === my) {
          toast(`Voces realistas no disponibles (${describeAiError(e)}). Uso la voz del dispositivo.`);
          engine.current = 'device';
          setLoading(false);
          void deviceFrom(segs[s][0] <= from ? from : segs[s][0], my);
        }
        return;
      } finally {
        setLoading(false);
      }
      if (token.current !== my) return;
      if (s + 1 < segs.length) void segAudio(s + 1).catch(() => undefined);
      const idxs = segs[s];
      const before = idxs.filter((i) => i < from).reduce((a, i) => a + lines[i].text.length, 0);
      const total = idxs.reduce((a, i) => a + lines[i].text.length, 0) || 1;
      const ended = await playBlob(blob, before / total, idxs, my);
      from = -1;
      if (!ended || token.current !== my) return;
      if (askOrEnd(idxs[idxs.length - 1], my)) return;
    }
    if (token.current === my) {
      setPlaying(false);
      setIdx(0);
    }
  };

  const playFrom = (from: number) => {
    stopAll();
    const my = token.current;
    setAsking(null);
    setFeedback(null);
    setPlaying(true);
    setIdx(from);
    void (engine.current === 'gemini' ? geminiFrom(from, my) : deviceFrom(from, my));
  };

  const pause = () => {
    stopAll();
    setPlaying(false);
    setLoading(false);
  };

  const answer = async (line: number, picked: number) => {
    const ok = picked === lines[line].answer;
    setAnswers((a) => ({ ...a, [line]: ok }));
    setFeedback({ line, picked, ok });
    const other = (lines[line].host === 0 ? 1 : 0) as 0 | 1;
    const text = feedbackText(lines[line], ok);
    stopAll();
    const my = token.current;
    setPlaying(true);
    try {
      if (engine.current === 'gemini') {
        const { geminiSpeech } = await import('../../ai/engine');
        const blob = await geminiSpeech(state.settings, [{ speaker: hosts[other], text }], { [hosts[other]]: voices.gemini[other] });
        if (token.current === my) await playBlob(blob, 0, [line], my);
      } else await speak(text, other, rate, voices.device);
    } catch {
      try {
        if (token.current === my) await speak(text, other, rate, voices.device);
      } catch {
        // sin voz: se lee en pantalla
      }
    }
    if (token.current === my) setPlaying(false);
  };

  const total = estimateSeconds(lines.map((l) => l.text)) / rate;
  const done = estimateSeconds(lines.slice(0, idx).map((l) => l.text)) / rate;
  const right = Object.values(answers).filter(Boolean).length;
  const q = asking !== null ? lines[asking] : feedback ? lines[feedback.line] : null;
  const qLine = asking ?? feedback?.line ?? -1;

  return (
    <>
      <div className="cover">{STYLES[pod.style ?? 'charla'].emoji}</div>
      <div style={{ textAlign: 'center' }}>
        <h2>{pod.title}</h2>
        <p className="muted small">
          Con {hosts[0]} y {hosts[1]} · {STYLES[pod.style ?? 'charla'].label} · {LENGTHS.find((l) => l.id === pod.length)?.label}
        </p>
        {questions.length > 0 && (
          <span className="tag pill-accent" style={{ marginTop: 8 }}>
            ❓ {Object.keys(answers).length}/{questions.length} preguntas{Object.keys(answers).length > 0 && ` · ${right} bien`}
          </span>
        )}
      </div>

      {q && (
        <section ref={questionRef} className="card pad col pop" style={{ gap: 10, borderColor: 'var(--accent)' }} aria-live="polite">
          <div className="tag pill-accent" style={{ alignSelf: 'flex-start' }}>
            ⏸️ {hosts[q.host]} te pregunta
          </div>
          <div style={{ fontWeight: 650, fontSize: 18, lineHeight: 1.4 }}>{q.text}</div>
          {q.options!.map((o, k) => {
            const cls = !feedback ? 'option' : k === q.answer ? 'option right' : k === feedback.picked ? 'option wrong' : 'option dim';
            return (
              <button key={k} className={cls} disabled={!!feedback} onClick={() => void answer(qLine, k)}>
                <span className="key">{'ABC'[k] ?? k + 1}</span>
                <span className="grow">{o}</span>
              </button>
            );
          })}
          {feedback && (
            <div className={`feedback ${feedback.ok ? 'ok' : 'ko'} fadein`}>
              <div style={{ fontWeight: 700, color: feedback.ok ? 'var(--good)' : 'var(--bad)' }}>
                {hosts[q.host === 0 ? 1 : 0]}: {feedbackText(q, feedback.ok, () => 0)}
              </div>
              <button className="btn block" onClick={() => playFrom(feedback.line + 1)}>
                <Play size={16} fill="currentColor" /> Seguir escuchando
              </button>
            </div>
          )}
          {!feedback && (
            <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => playFrom(qLine + 1)}>
              Saltar pregunta
            </button>
          )}
        </section>
      )}

      <div className="col" style={{ gap: 6 }}>
        <div className="bar">
          <span style={{ width: `${(100 * idx) / Math.max(1, lines.length - 1)}%`, background: 'var(--accent)' }} />
        </div>
        <div className="row small faint">
          <span className="grow">{mmss(done)}</span>
          <span>{mmss(total)}</span>
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: 18 }}>
        <button className="iconbtn filled" aria-label="Anterior" onClick={() => playFrom(Math.max(0, idx - 1))}>
          <SkipBack size={20} />
        </button>
        <button className="btn" style={{ width: 70, height: 70, borderRadius: 999, padding: 0 }} aria-label={playing ? 'Pausa' : 'Reproducir'} onClick={() => (playing ? pause() : playFrom(asking !== null ? asking : idx))}>
          {loading ? <div className="spinner" /> : playing ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" />}
        </button>
        <button className="iconbtn filled" aria-label="Siguiente" onClick={() => playFrom(Math.min(lines.length - 1, idx + 1))}>
          <SkipForward size={20} />
        </button>
      </div>
      <div className="row wrap" style={{ justifyContent: 'center', gap: 6 }}>
        <div className={`wave${playing ? '' : ' paused'}`} aria-hidden>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        {RATES.map((r) => (
          <button key={r} className="chip" aria-pressed={rate === r} onClick={() => update((s) => setSettings(s, { podcastRate: r }))}>
            {r}×
          </button>
        ))}
      </div>
      <div className="row wrap" style={{ justifyContent: 'center', gap: 8 }}>
        <button className="chip" onClick={onVoices}>
          <Mic2 size={14} /> Voces: {voices.engine === 'gemini' ? 'realistas' : 'del dispositivo'}
        </button>
        <button className="chip" aria-pressed={questionsOn} onClick={() => update((s) => setSettings(s, { podcastQuestions: !s.settings.podcastQuestions }))}>
          ❓ Preguntas {questionsOn ? 'sí' : 'no'}
        </button>
      </div>

      <section className="card col" style={{ padding: 8, gap: 2 }}>
        {lines.map((l, k) => (
          <div key={k} ref={(el) => (lineRefs.current[k] = el)} className={`line${k === idx ? ' now' : ''}`} onClick={() => playFrom(k)}>
            <span className="who" style={{ color: HOST_COLOR[l.host], width: 56 }}>
              {hosts[l.host]}
            </span>
            <span style={{ fontSize: 15, lineHeight: 1.5 }}>
              {isQuestion(l) && '❓ '}
              {l.text}
              {k in answers && <span className={`tag ${answers[k] ? 'pill-good' : 'pill-bad'}`} style={{ marginLeft: 6 }}>{answers[k] ? '✓' : '✗'}</span>}
            </span>
          </div>
        ))}
      </section>
    </>
  );
}

// ---------- Elegir voces ----------

function VoicesSheet({ hosts, onClose }: { hosts: [string, string]; onClose: () => void }) {
  const { state, update } = useApp();
  const v = state.settings.podcastVoices;
  const [list, setList] = useState<DeviceVoice[]>([]);
  const [testing, setTesting] = useState<string | null>(null);
  useEffect(() => {
    void deviceVoices().then(setList);
  }, []);
  const save = (p: Partial<PodcastVoices>) => update((s) => setSettings(s, { podcastVoices: { ...s.settings.podcastVoices, ...p } }));
  const sample = (h: 0 | 1) => `Hola, soy ${hosts[h]}. Así sonaré en tus pódcast de Tidepopper.`;

  const tryVoice = async (h: 0 | 1, id: string) => {
    setTesting(id);
    try {
      if (v.engine === 'gemini') {
        const { geminiSpeech } = await import('../../ai/engine');
        const blob = await geminiSpeech(state.settings, [{ speaker: hosts[h], text: sample(h) }], { [hosts[h]]: v.gemini[h] });
        const url = URL.createObjectURL(blob);
        const a = new Audio(url);
        a.onended = () => URL.revokeObjectURL(url);
        await a.play();
      } else await speak(sample(h), h, state.settings.podcastRate || 1, v.device);
    } catch (e) {
      const { describeAiError } = await import('../../ai/engine');
      toast(describeAiError(e));
    } finally {
      setTesting(null);
    }
  };

  return (
    <Sheet title="Voces del pódcast" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button className="chip" aria-pressed={v.engine === 'device'} onClick={() => save({ engine: 'device' })} style={{ flexDirection: 'column', gap: 2, padding: 10, borderRadius: 16, whiteSpace: 'normal' }}>
          <b>📱 Del dispositivo</b>
          <span style={{ fontSize: 11 }}>Sin internet ni límites</span>
        </button>
        <button className="chip" aria-pressed={v.engine === 'gemini'} onClick={() => save({ engine: 'gemini' })} style={{ flexDirection: 'column', gap: 2, padding: 10, borderRadius: 16, whiteSpace: 'normal' }}>
          <b>✨ Realistas (Gemini)</b>
          <span style={{ fontSize: 11 }}>Gratis con tu clave · 30 voces</span>
        </button>
      </div>
      {v.engine === 'gemini' && !state.settings.geminiKey && <div className="alert info">Las voces realistas necesitan la clave gratis de Gemini (Ajustes).</div>}
      {v.engine === 'gemini' && <p className="faint small">El audio de cada episodio se guarda en el dispositivo: la segunda vez suena sin gastar peticiones.</p>}
      {([0, 1] as const).map((h) => (
        <div key={h} className="col" style={{ gap: 6 }}>
          <span className="label" style={{ color: HOST_COLOR[h] }}>
            {hosts[h]}
          </span>
          <div className="row">
            {v.engine === 'gemini' ? (
              <select className="field grow" value={v.gemini[h]} onChange={(e) => save({ gemini: (h === 0 ? [e.target.value, v.gemini[1]] : [v.gemini[0], e.target.value]) as [string, string] })}>
                {GEMINI_VOICES.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.name} · {g.text}
                  </option>
                ))}
              </select>
            ) : (
              <select
                className="field grow"
                value={v.device[h] ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : Number(e.target.value);
                  save({ device: (h === 0 ? [val, v.device[1]] : [v.device[0], val]) as [number | null, number | null] });
                }}
              >
                <option value="">Automática</option>
                {list.map((d) => (
                  <option key={d.index} value={d.index}>
                    {d.name} ({d.lang})
                  </option>
                ))}
              </select>
            )}
            <button className="iconbtn filled" aria-label={`Probar la voz de ${hosts[h]}`} disabled={!!testing} onClick={() => void tryVoice(h, `${h}`)}>
              {testing === `${h}` ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>
      ))}
      {v.engine === 'device' && list.length === 0 && <p className="faint small">Este dispositivo no ofrece voces para elegir; se usará la que tenga por defecto.</p>}
      <button className="btn block" onClick={onClose}>
        Listo
      </button>
    </Sheet>
  );
}
