import { useRef, useState } from 'react';
import { useApp } from '../data/store';
import { hydrate } from '../data/actions';
import { levelInfo } from '../logic/rewards';
import { Header, Nav } from '../components/ui';

export default function Settings() {
  const { state, update } = useApp();
  const [key, setKey] = useState(state.settings.apiKey);
  const [msg, setMsg] = useState('');
  const fileIn = useRef<HTMLInputElement>(null);
  const lvl = levelInfo(state.wallet.xp);

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ ...state, settings: { apiKey: '' } }, null, 1)], { type: 'application/json' });
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

      <section className="px" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2>Clave de Claude</h2>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>
          La IA (crear tarjetas y resúmenes, corregir tus explicaciones) usa tu clave de la API de Claude. Se guarda solo en este dispositivo. Consíguela en console.anthropic.com.
        </p>
        <label className="sr" htmlFor="key">
          Clave de la API
        </label>
        <input id="key" className="field" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-…" />
        <button
          className="btn"
          onClick={() => {
            update((s) => ({ ...s, settings: { ...s.settings, apiKey: key.trim() } }));
            setMsg('Clave guardada en este dispositivo.');
          }}
        >
          Guardar clave
        </button>
      </section>

      <section className="px" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2>Copia de seguridad</h2>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>Tus datos viven en este dispositivo. Descarga una copia para no perderlos o para pasarlos a otro (la clave no se incluye).</p>
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
