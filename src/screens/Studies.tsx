import { useState } from 'react';
import { useApp } from '../data/store';
import { createStudy, studyCards, studyMemory } from '../data/actions';
import { uid } from '../data/db';
import { go } from '../router';
import type { FolderColor } from '../data/types';
import { FOLDER_BAR, folderIcon, Header, icon, Nav, Progress } from '../components/ui';

const COLORS: FolderColor[] = ['blue', 'mint', 'gold', 'coral'];
const COLOR_NAME: Record<FolderColor, string> = { blue: 'Azul', mint: 'Verde', gold: 'Dorado', coral: 'Coral' };

export default function Studies({ startNew }: { startNew: boolean }) {
  const { state, update } = useApp();
  const [creating, setCreating] = useState(startNew);
  const [name, setName] = useState('');
  const [color, setColor] = useState<FolderColor>(COLORS[state.studies.length % 4]);
  const now = Date.now();

  const create = () => {
    if (!name.trim()) return;
    const id = uid();
    update((s) => createStudy(s, name, color, Date.now(), id));
    go(`/estudio/${id}/anadir`);
  };

  return (
    <main className="screen">
      <Header title="Mis estudios">
        <span className="lcd" style={{ padding: '6px 10px', fontSize: 20, lineHeight: 1 }}>
          {state.studies.length} CARPETAS
        </span>
      </Header>

      {creating ? (
        <form
          className="lcd"
          style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <div>
            <label className="lbl" htmlFor="nombre">
              NOMBRE DEL ESTUDIO
            </label>
            <input id="nombre" className="field" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Biología · La célula" />
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="lbl">COLOR DE LA CARPETA</legend>
            <div className="row" style={{ gap: 14 }}>
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} aria-pressed={color === c} aria-label={COLOR_NAME[c]} className="iconbtn" style={{ background: color === c ? 'var(--lcd-hi)' : 'transparent', width: 56, height: 56 }}>
                  <img src={folderIcon(c)} alt="" style={{ width: 40, height: 40 }} />
                </button>
              ))}
            </div>
          </fieldset>
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => setCreating(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn gold grow" disabled={!name.trim()}>
              Crear y añadir apuntes
            </button>
          </div>
        </form>
      ) : (
        <button className="btn block" onClick={() => setCreating(true)} style={{ background: 'transparent', boxShadow: 'none', outline: '3px dashed var(--blue-sh)', outlineOffset: -3, color: 'var(--glow)' }}>
          <img src={icon('plus')} alt="" width={22} height={22} />
          Nuevo estudio
        </button>
      )}

      <div className="grid2" style={{ rowGap: 22 }}>
        {state.studies.map((s) => {
          const m = studyMemory(state, s.id, now);
          return (
            <a key={s.id} href={`#/estudio/${s.id}`} className="px" style={{ textDecoration: 'none', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 170 }}>
              <img src={folderIcon(s.color)} alt="" width={52} height={52} />
              <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 16, lineHeight: 1.15 }}>{s.name}</div>
              <div className="vt" style={{ color: 'var(--ink-soft)', fontSize: 17 }}>
                {studyCards(state, s.id).length} TARJETAS · {m === null ? 'SIN EMPEZAR' : `${m}%`}
              </div>
              <div style={{ marginTop: 'auto' }}>
                <Progress value={m ?? 0} color={FOLDER_BAR[s.color]} />
              </div>
            </a>
          );
        })}
      </div>
      <Nav active="estudios" />
    </main>
  );
}
