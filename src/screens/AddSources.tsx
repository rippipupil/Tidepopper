import { useRef, useState } from 'react';
import { useApp } from '../data/store';
import { addCards, addSource, setSummary } from '../data/actions';
import { saveFile, uid } from '../data/db';
import type { AiPart } from '../ai/claude';
import { fileToBase64 } from '../data/files';
import { go } from '../router';
import type { Source } from '../data/types';
import { Header, icon } from '../components/ui';
import { Missing } from './StudyView';

type Pending = { source: Source; part: AiPart };
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

export default function AddSources({ id }: { id: string }) {
  const { state, update } = useApp();
  const study = state.studies.find((s) => s.id === id);
  const [pending, setPending] = useState<Pending[]>([]);
  const [mode, setMode] = useState<'pick' | 'text' | 'manual'>('pick');
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const pdfInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  if (!study) return <Missing />;

  const addFiles = async (files: FileList | null, kind: 'pdf' | 'image') => {
    if (!files) return;
    const next: Pending[] = [];
    for (const f of Array.from(files)) {
      if (kind === 'image' && !IMAGE_TYPES.includes(f.type as ImageType)) {
        setMsg({ kind: 'err', text: `«${f.name}» no es JPG, PNG, GIF ni WebP.` });
        continue;
      }
      const sid = uid();
      const base64 = await fileToBase64(f);
      await saveFile(sid, f);
      const source: Source = { id: sid, studyId: id, kind, name: f.name, addedAt: Date.now(), mediaType: f.type };
      next.push({ source, part: kind === 'pdf' ? { kind: 'pdf', name: f.name, base64 } : { kind: 'image', name: f.name, base64, mediaType: f.type as ImageType } });
    }
    setPending((p) => [...p, ...next]);
  };

  const addText = () => {
    if (!text.trim()) return;
    const name = title.trim() || `Texto ${pending.length + 1}`;
    const source: Source = { id: uid(), studyId: id, kind: 'text', name, addedAt: Date.now(), text };
    setPending((p) => [...p, { source, part: { kind: 'text', name, text } }]);
    setText('');
    setTitle('');
    setMode('pick');
  };

  const generate = async () => {
    if (!state.settings.apiKey) {
      setMsg({ kind: 'err', text: 'Para que la IA cree el material, pon tu clave de Claude en Perfil → Ajustes. También puedes crear tarjetas a mano.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { generateStudyPack } = await import('../ai/claude');
      const pack = await generateStudyPack(state.settings.apiKey, study.name, pending.map((p) => p.part));
      update((s) => {
        let n = s;
        for (const p of pending) n = addSource(n, p.source);
        n = setSummary(n, id, pack.summary);
        return addCards(n, id, pack.cards, Date.now(), uid);
      });
      setPending([]);
      go(`/estudio/${id}`);
    } catch (e) {
      const { describeAiError } = await import('../ai/claude');
      setMsg({ kind: 'err', text: describeAiError(e) });
    } finally {
      setBusy(false);
    }
  };

  const addManual = () => {
    if (!front.trim() || !back.trim()) return;
    update((s) => addCards(s, id, [{ front, back }], Date.now(), uid));
    setFront('');
    setBack('');
    setMsg({ kind: 'ok', text: 'Tarjeta añadida.' });
  };

  return (
    <main className="screen">
      <Header back={`#/estudio/${id}`} title={study.name} />
      <div>
        <h2 style={{ fontSize: 24 }}>Añade tus apuntes</h2>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          La IA los lee y crea un resumen y tarjetas de repaso.
        </p>
      </div>

      <input ref={pdfInput} type="file" accept="application/pdf" multiple hidden onChange={(e) => void addFiles(e.target.files, 'pdf')} />
      <input ref={photoInput} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => void addFiles(e.target.files, 'image')} />

      {mode === 'pick' && (
        <div className="grid2">
          <button className="px tile" onClick={() => pdfInput.current?.click()}>
            <img src={icon('pdf')} alt="" />
            PDF
          </button>
          <button className="px tile" onClick={() => photoInput.current?.click()}>
            <img src={icon('photo')} alt="" />
            Foto
          </button>
          <button className="px tile" onClick={() => setMode('text')}>
            <img src={icon('text')} alt="" />
            Texto
          </button>
          <button className="px tile" onClick={() => setMode('manual')}>
            <img src={icon('cards')} alt="" />A mano
          </button>
        </div>
      )}

      {mode === 'text' && (
        <div className="lcd" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="lbl" htmlFor="t-title">
            TÍTULO (OPCIONAL)
          </label>
          <input id="t-title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej.: Apuntes del tema 3" />
          <label className="lbl" htmlFor="t-body">
            PEGA AQUÍ EL TEXTO
          </label>
          <textarea id="t-body" className="field" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="row">
            <button className="btn ghost" onClick={() => setMode('pick')}>
              Volver
            </button>
            <button className="btn grow" onClick={addText} disabled={!text.trim()}>
              Añadir texto
            </button>
          </div>
        </div>
      )}

      {mode === 'manual' && (
        <div className="lcd" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="lbl" htmlFor="m-front">
            DELANTE (TÉRMINO O PREGUNTA)
          </label>
          <input id="m-front" className="field" value={front} onChange={(e) => setFront(e.target.value)} />
          <label className="lbl" htmlFor="m-back">
            DETRÁS (RESPUESTA)
          </label>
          <textarea id="m-back" className="field" style={{ minHeight: 90 }} value={back} onChange={(e) => setBack(e.target.value)} />
          <div className="row">
            <button className="btn ghost" onClick={() => setMode('pick')}>
              Volver
            </button>
            <button className="btn grow" onClick={addManual} disabled={!front.trim() || !back.trim()}>
              Guardar tarjeta
            </button>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="lcd" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pending.map((p) => (
            <div key={p.source.id} className="row" style={{ fontSize: 19 }}>
              <img src={icon(p.source.kind === 'pdf' ? 'pdf' : p.source.kind === 'image' ? 'photo' : 'text')} alt="" width={20} height={20} />
              <span className="grow">{p.source.name.toUpperCase()}</span>
              <button className="btn ghost" style={{ minHeight: 32, padding: '2px 10px', fontSize: 13 }} onClick={() => setPending((x) => x.filter((y) => y !== p))} aria-label={`Quitar ${p.source.name}`}>
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}

      {msg && (
        <div className="lcd toast" role="status" style={{ fontSize: 19, color: msg.kind === 'err' ? 'var(--coral)' : 'var(--mint)' }}>
          {msg.text}
        </div>
      )}

      <div style={{ marginTop: 'auto' }}>
        <button className="btn gold block" onClick={() => void generate()} disabled={busy || pending.length === 0}>
          {busy ? 'Leyendo tus apuntes…' : 'Crear material de estudio'}
        </button>
      </div>
    </main>
  );
}
