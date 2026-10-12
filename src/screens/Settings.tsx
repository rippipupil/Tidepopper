import { useRef, useState } from 'react';
import { Download, Monitor, Moon, Sun, Upload } from 'lucide-react';
import { useApp } from '../data/store';
import { DEFAULT_SETTINGS, hydrate, setSettings } from '../data/actions';
import { dueCount } from '../logic/learn';
import type { Theme } from '../data/types';
import { BottomNav, TopBar, toast } from '../components/ui';

const THEMES: { id: Theme; label: string; icon: React.ReactNode }[] = [
  { id: 'system', label: 'Sistema', icon: <Monitor size={16} /> },
  { id: 'dark', label: 'Oscuro', icon: <Moon size={16} /> },
  { id: 'light', label: 'Claro', icon: <Sun size={16} /> },
];

export default function Settings() {
  const { state, update } = useApp();
  const fileIn = useRef<HTMLInputElement>(null);

  const exportBackup = () => {
    const data = { ...state, settings: { ...state.settings, apiKey: '', geminiKey: '', groqKey: '' } };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    a.download = `tidepopper-copia-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importBackup = async (f: File | undefined) => {
    if (!f) return;
    try {
      const data = hydrate(JSON.parse(await f.text()));
      if (!confirm(`¿Sustituir todo lo de este dispositivo por la copia (${data.notes.length} notas, ${data.cards.length} tarjetas)?`)) return;
      update(() => ({ ...data, settings: state.settings }));
      toast('Copia restaurada');
    } catch {
      toast('Ese archivo no es una copia de Tidepopper');
    }
  };

  return (
    <div className="app">
      <TopBar title="Ajustes" />
      <main className="page">
        <section className="card pad col" style={{ gap: 12 }}>
          <h2>Apariencia</h2>
          <div className="row" style={{ gap: 8 }}>
            {THEMES.map((t) => (
              <button key={t.id} className="chip" aria-pressed={state.settings.theme === t.id} onClick={() => update((s) => setSettings(s, { theme: t.id }))} style={{ padding: '9px 14px' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </section>

        <section className="card pad col" style={{ gap: 16 }}>
          <div>
            <h2>Inteligencia artificial</h2>
            <p className="muted small" style={{ marginTop: 6 }}>
              <b>Sin ninguna clave también funciona gratis</b>: la app te prepara la petición para pegarla en tu app de Claude. Con una clave gratis se hace todo solo, y grabar clases o usar YouTube
              necesita la de Gemini. Las claves se guardan solo en este dispositivo.
            </p>
          </div>
          <KeyField
            id="gemini"
            title="Gemini · gratis (recomendada)"
            help="Lee PDF, fotos, audio y vídeos de YouTube. Crea la clave gratis, sin tarjeta, con tu cuenta de Google en"
            link="https://aistudio.google.com/apikey"
            placeholder="AIza…"
            value={state.settings.geminiKey}
            onSave={(v) => update((s) => setSettings(s, { geminiKey: v }))}
          />
          <KeyField
            id="groq"
            title="Groq · gratis (de reserva)"
            help="Muchos usos al día. Texto y transcribir audio. Se usa si Gemini se queda sin cuota. Clave gratis en"
            link="https://console.groq.com/keys"
            placeholder="gsk_…"
            value={state.settings.groqKey}
            onSave={(v) => update((s) => setSettings(s, { groqKey: v }))}
          />
          <KeyField
            id="claude"
            title="Claude · de pago (opcional)"
            help="La mejor calidad, se paga por uso. Si la pones, se usa primero. Clave en"
            link="https://console.anthropic.com"
            placeholder="sk-ant-…"
            value={state.settings.apiKey}
            onSave={(v) => update((s) => setSettings(s, { apiKey: v }))}
          />
        </section>

        <section className="card pad col" style={{ gap: 12 }}>
          <h2>Tus datos</h2>
          <p className="muted small">
            Todo vive solo en este dispositivo: {state.notes.length} notas y {state.cards.length} tarjetas. Descarga una copia para no perderlo o para pasarlo a otro dispositivo (las claves no se incluyen; los
            archivos originales tampoco).
          </p>
          <div className="row">
            <button className="btn secondary grow" onClick={exportBackup}>
              <Download size={17} /> Descargar copia
            </button>
            <button className="btn secondary grow" onClick={() => fileIn.current?.click()}>
              <Upload size={17} /> Restaurar
            </button>
          </div>
          <input ref={fileIn} type="file" accept="application/json" hidden onChange={(e) => void importBackup(e.target.files?.[0])} />
        </section>

        <p className="faint small" style={{ textAlign: 'center' }}>
          Tidepopper · apuntes, tarjetas, quiz, chat y pódcast con IA gratis
        </p>
      </main>
      <BottomNav active="ajustes" due={dueCount(state.cards, Date.now())} />
    </div>
  );
}

/** Campo de una clave: guardar y probar que funciona. */
function KeyField(p: { id: 'gemini' | 'groq' | 'claude'; title: string; help: string; link: string; placeholder: string; value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(p.value);
  const [status, setStatus] = useState<{ ok: boolean | null; text: string } | null>(p.value ? { ok: null, text: 'Guardada' } : null);
  const [busy, setBusy] = useState(false);

  const saveAndTest = async () => {
    const key = v.trim();
    p.onSave(key);
    if (!key) {
      setStatus({ ok: null, text: 'Clave borrada' });
      return;
    }
    setBusy(true);
    setStatus({ ok: null, text: 'Probando…' });
    try {
      const { testProvider, describeAiError } = await import('../ai/tasks');
      const keys = { ...DEFAULT_SETTINGS, [p.id === 'claude' ? 'apiKey' : `${p.id}Key`]: key };
      try {
        await testProvider(p.id, keys);
        setStatus({ ok: true, text: '✓ Guardada y funciona' });
      } catch (e) {
        setStatus({ ok: false, text: `Guardada, pero no funciona: ${describeAiError(e)}` });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="col" style={{ gap: 8 }}>
      <label htmlFor={`key-${p.id}`} style={{ fontWeight: 650 }}>
        {p.title}
      </label>
      <span className="muted small">
        {p.help}{' '}
        <a href={p.link} target="_blank" rel="noreferrer">
          {p.link.replace('https://', '')}
        </a>
      </span>
      <div className="row">
        <input id={`key-${p.id}`} className="field grow" type="password" autoComplete="off" value={v} onChange={(e) => setV(e.target.value)} placeholder={p.placeholder} />
        <button className="btn" disabled={busy} onClick={() => void saveAndTest()}>
          {busy ? <div className="spinner" style={{ width: 16, height: 16 }} /> : 'Guardar'}
        </button>
      </div>
      {status && (
        <span role="status" className="small" style={{ color: status.ok === true ? 'var(--good)' : status.ok === false ? 'var(--bad)' : 'var(--muted)' }}>
          {status.text}
        </span>
      )}
    </div>
  );
}
