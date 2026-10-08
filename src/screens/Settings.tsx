import { useRef, useState } from 'react';
import { useApp } from '../data/store';
import { hydrate, initialState } from '../data/actions';
import { levelInfo } from '../logic/rewards';
import { Header, Nav } from '../components/ui';

export default function Settings() {
  const { state, update } = useApp();
  const [msg, setMsg] = useState('');
  const fileIn = useRef<HTMLInputElement>(null);
  const lvl = levelInfo(state.wallet.xp);

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ ...state, settings: initialState().settings }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tidepopper-copia-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importBackup = async (f: File | undefined) => {
    if (!f) return;
    try {
      const data = hydrate(JSON.parse(await f.text()));
      if (!confirm('¿Sustituir todo lo que hay en este dispositivo por la copia?')) return;
      update(() => ({ ...data, settings: state.settings }));
      setMsg('Copia restaurada.');
    } catch {
      setMsg('Ese archivo no es una copia de Tidepopper.');
    }
  };

  return (
    <main className="screen">
      <Header title="Perfil" />
      <div className="lcd" style={{ padding: 16, fontSize: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div>
          NIVEL {lvl.level} · {state.wallet.xp} XP
        </div>
        <div style={{ color: 'var(--dim)' }}>
          RACHA {state.streak.days} DÍAS · {state.studies.length} ESTUDIOS · {state.cards.length} TARJETAS
        </div>
      </div>

      <a className="btn ghost" href="#/logros">
        <img src="img/sprites/s-xp.svg" alt="" width={22} height={22} />
        Logros
      </a>

      <section className="px" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2>Inteligencia artificial</h2>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>
          La IA crea tarjetas y resúmenes, cursos y exámenes, y corrige tus respuestas. <b>Sin ninguna clave también funciona gratis</b>: la app te prepara la
          petición para pegarla en tu app de Claude. Con una clave gratis se hace solo. Las claves se guardan solo en este dispositivo.
        </p>
        <KeyField
          id="gemini"
          title="Gemini · gratis (recomendada)"
          help="Lee también PDF y fotos. Crea la clave gratis, sin tarjeta, con tu cuenta de Google en"
          link="https://aistudio.google.com/apikey"
          placeholder="AIza…"
          value={state.settings.geminiKey}
          onSave={(v) => update((s) => ({ ...s, settings: { ...s.settings, geminiKey: v } }))}
        />
        <KeyField
          id="groq"
          title="Groq · gratis (de reserva)"
          help="Muchos usos al día, solo texto. Se usa si Gemini se queda sin cuota. Clave gratis en"
          link="https://console.groq.com/keys"
          placeholder="gsk_…"
          value={state.settings.groqKey}
          onSave={(v) => update((s) => ({ ...s, settings: { ...s.settings, groqKey: v } }))}
        />
        <KeyField
          id="claude"
          title="Claude · de pago (opcional)"
          help="La mejor calidad, se paga por uso. Si la pones, se usa primero. Clave en"
          link="https://console.anthropic.com"
          placeholder="sk-ant-…"
          value={state.settings.apiKey}
          onSave={(v) => update((s) => ({ ...s, settings: { ...s.settings, apiKey: v } }))}
        />
      </section>

      <section className="px" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2>Copia de seguridad</h2>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>Tus datos viven en este dispositivo. Descarga una copia para no perderlos o para pasarlos a otro (las claves no se incluyen).</p>
        <div className="row">
          <button className="btn grow" onClick={exportBackup}>
            Descargar copia
          </button>
          <button className="btn ghost grow" onClick={() => fileIn.current?.click()}>
            Restaurar
          </button>
        </div>
        <input ref={fileIn} type="file" accept="application/json" hidden onChange={(e) => void importBackup(e.target.files?.[0])} />
      </section>

      {msg && (
        <div className="lcd toast" role="status" style={{ fontSize: 19 }}>
          {msg}
        </div>
      )}
      <Nav active="perfil" />
    </main>
  );
}

/** Campo de una clave: guardar y probar que funciona. */
function KeyField(p: { id: 'gemini' | 'groq' | 'claude'; title: string; help: string; link: string; placeholder: string; value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(p.value);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const saveAndTest = async () => {
    const key = v.trim();
    p.onSave(key);
    if (!key) {
      setStatus('Clave borrada.');
      return;
    }
    setBusy(true);
    setStatus('Probando…');
    try {
      const { testProvider, describeAiError } = await import('../ai/claude');
      const keys = { apiKey: '', geminiKey: '', groqKey: '', [p.id === 'claude' ? 'apiKey' : `${p.id}Key`]: key };
      try {
        await testProvider(p.id, keys);
        setStatus('✓ Guardada y funciona.');
      } catch (e) {
        setStatus(`Guardada, pero no funciona: ${describeAiError(e)}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={`key-${p.id}`} style={{ fontWeight: 700, fontSize: 14 }}>
        {p.title}
      </label>
      <span style={{ fontSize: 13, lineHeight: 1.4 }}>
        {p.help}{' '}
        <a href={p.link} target="_blank" rel="noreferrer" style={{ color: 'var(--blue-sh)' }}>
          {p.link.replace('https://', '')}
        </a>
      </span>
      <div className="row">
        <input id={`key-${p.id}`} className="field grow" type="password" autoComplete="off" value={v} onChange={(e) => setV(e.target.value)} placeholder={p.placeholder} />
        <button className="btn" disabled={busy} onClick={() => void saveAndTest()}>
          Guardar
        </button>
      </div>
      {status && (
        <span role="status" style={{ fontSize: 13 }}>
          {status}
        </span>
      )}
    </div>
  );
}
