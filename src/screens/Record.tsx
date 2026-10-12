import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, Pause, Play, Square, Trash2 } from 'lucide-react';
import { del, get, set } from 'idb-keyval';
import { useApp } from '../data/store';
import { startJob } from '../data/jobs';
import { go } from '../router';
import { TopBar, toast } from '../components/ui';

// La grabación se guarda en el dispositivo cada pocos segundos: si la app se cierra
// o el móvil se queda sin batería, se puede recuperar.
const DRAFT = 'tidepopper:recording-draft';

type Phase = 'idle' | 'recording' | 'paused' | 'done';

const fmt = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(ss).padStart(2, '0')}`;
};

export default function Record() {
  const { state, update } = useApp();
  const [phase, setPhase] = useState<Phase>('idle');
  const [secs, setSecs] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [err, setErr] = useState('');
  const [draft, setDraft] = useState<{ blob: Blob; secs: number } | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const lock = useRef<{ release: () => Promise<void> } | null>(null);
  const secsRef = useRef(0);

  useEffect(() => {
    void get<{ blob: Blob; secs: number }>(DRAFT).then((d) => d && d.blob.size > 0 && setDraft(d));
    return () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      void lock.current?.release();
    };
  }, []);

  useEffect(() => {
    if (phase !== 'recording') return;
    const t = window.setInterval(() => {
      secsRef.current += 1;
      setSecs(secsRef.current);
      if (secsRef.current % 10 === 0 && chunks.current.length) void set(DRAFT, { blob: new Blob(chunks.current, { type: rec.current?.mimeType }), secs: secsRef.current });
    }, 1000);
    return () => window.clearInterval(t);
  }, [phase]);

  const start = async () => {
    setErr('');
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setErr('No se puede usar el micrófono. Dale permiso a la app en los ajustes del móvil o del navegador.');
      return;
    }
    const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported?.(t));
    const r = new MediaRecorder(stream.current, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 48000 });
    chunks.current = [];
    secsRef.current = 0;
    setSecs(0);
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      const b = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' });
      setBlob(b);
      void set(DRAFT, { blob: b, secs: secsRef.current });
      stream.current?.getTracks().forEach((t) => t.stop());
    };
    r.start(1000);
    rec.current = r;
    setPhase('recording');
    try {
      lock.current = await (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null;
    } catch {
      // Sin bloqueo de pantalla: solo hay que mantenerla encendida.
    }
  };

  const pause = () => {
    rec.current?.pause();
    setPhase('paused');
  };
  const resume = () => {
    rec.current?.resume();
    setPhase('recording');
  };
  const stop = () => {
    rec.current?.stop();
    void lock.current?.release();
    setPhase('done');
  };
  const discard = () => {
    if (!confirm('¿Borrar la grabación?')) return;
    void del(DRAFT);
    setBlob(null);
    setDraft(null);
    setPhase('idle');
    setSecs(0);
  };
  const create = (b: Blob, s: number) => {
    startJob({ kind: 'recording', blob: b, seconds: s }, state.settings, update);
    void del(DRAFT);
    toast('Creando tus apuntes…');
    go('/');
  };

  const noKeys = !state.settings.geminiKey && !state.settings.groqKey;
  const draftUrl = useMemo(() => (draft ? URL.createObjectURL(draft.blob) : ''), [draft]);
  const blobUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : ''), [blob]);

  return (
    <div className="app">
      <TopBar back="#/" title="Grabar clase" />
      <main className="page" style={{ gap: 22 }}>
        {noKeys && (
          <div className="alert info">
            Para pasar la grabación a texto hace falta una clave <b>gratis</b> de Gemini o Groq. Ponla en <a href="#/ajustes">Ajustes</a>: tardas 2 minutos.
          </div>
        )}
        {draft && phase === 'idle' && (
          <div className="card pad col">
            <div style={{ fontWeight: 650 }}>Tienes una grabación sin terminar ({fmt(draft.secs)})</div>
            <audio controls src={draftUrl} style={{ width: '100%' }} />
            <div className="row">
              <button className="btn ghost grow" onClick={discard}>
                Borrar
              </button>
              <button className="btn grow" onClick={() => create(draft.blob, draft.secs)}>
                Crear apuntes
              </button>
            </div>
          </div>
        )}

        <div className="col" style={{ alignItems: 'center', gap: 18, padding: '24px 0' }}>
          <div className="timer" aria-live="off">
            {fmt(secs)}
          </div>
          <div className="muted small">{phase === 'idle' ? 'Pulsa para empezar a grabar' : phase === 'recording' ? '● Grabando… deja la app abierta' : phase === 'paused' ? 'En pausa' : 'Grabación terminada'}</div>
          {phase === 'idle' && (
            <button className="rec" onClick={() => void start()} aria-label="Empezar a grabar">
              <Mic size={46} />
            </button>
          )}
          {(phase === 'recording' || phase === 'paused') && (
            <div className="row" style={{ gap: 24 }}>
              <button className="iconbtn filled" style={{ width: 64, height: 64 }} onClick={phase === 'recording' ? pause : resume} aria-label={phase === 'recording' ? 'Pausar' : 'Seguir'}>
                {phase === 'recording' ? <Pause size={28} /> : <Play size={28} />}
              </button>
              <button className={`rec${phase === 'recording' ? ' on' : ''}`} onClick={stop} aria-label="Terminar" style={{ width: 96, height: 96 }}>
                <Square size={34} fill="currentColor" />
              </button>
            </div>
          )}
        </div>

        {phase === 'done' && blob && (
          <div className="card pad col fadein">
            <audio controls src={blobUrl} style={{ width: '100%' }} />
            <div className="row">
              <button className="btn ghost" onClick={discard} aria-label="Borrar">
                <Trash2 size={18} />
              </button>
              <button className="btn grow" onClick={() => create(blob, secs)}>
                ✨ Crear apuntes
              </button>
            </div>
          </div>
        )}
        {err && <div className="alert bad">{err}</div>}
        <p className="faint small" style={{ textAlign: 'center' }}>
          Consejo: pon el móvil cerca de quien habla. La grabación se guarda sola cada 10 segundos.
        </p>
      </main>
    </div>
  );
}
