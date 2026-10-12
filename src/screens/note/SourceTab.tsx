import { useEffect, useState } from 'react';
import { Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { useApp } from '../../data/store';
import { addCards, updateNote } from '../../data/actions';
import { loadFile, uid } from '../../data/db';
import { fileToBase64 } from '../../data/files';
import type { Note, NoteSource } from '../../data/types';
import type { AiPart } from '../../ai/engine';
import { toast } from '../../components/ui';

const ICON: Record<string, string> = { pdf: '📄', image: '🖼️', text: '✍️', audio: '🎙️', video: '🎬', youtube: '▶️', doc: '📃', topic: '🧭' };

export default function SourceTab({ note }: { note: Note }) {
  const { state, update } = useApp();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  /** Vuelve a escribir los apuntes desde la fuente (por ejemplo, tras poner una IA mejor). */
  const regenerate = async () => {
    if (!confirm('¿Rehacer los apuntes desde la fuente? Se sustituyen los actuales (las tarjetas que tengas se conservan).')) return;
    setBusy(true);
    setErr('');
    try {
      const parts: AiPart[] = [];
      if (note.transcript) parts.push({ kind: 'text', name: 'Fuente', text: note.transcript });
      for (const s of note.sources) {
        if (s.kind !== 'pdf' && s.kind !== 'image') continue;
        const blob = await loadFile(s.id);
        if (!blob) continue;
        if (s.kind === 'pdf') parts.push({ kind: 'pdf', name: s.name, base64: await fileToBase64(blob) });
        else parts.push({ kind: 'image', name: s.name, base64: await fileToBase64(blob), mediaType: (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(s.mediaType ?? '') ? s.mediaType : 'image/jpeg') as 'image/jpeg' });
      }
      if (!parts.length) throw new Error('No queda ninguna fuente guardada de la que rehacer los apuntes.');
      const { generateNote } = await import('../../ai/tasks');
      const g = await generateNote(state.settings, parts);
      update((s) => addCards(updateNote(s, note.id, { summary: g.summary, keyPoints: g.keyPoints, markdown: g.markdown }), note.id, g.cards, Date.now(), uid));
      toast('Apuntes rehechos');
    } catch (e) {
      const { describeAiError } = await import('../../ai/tasks');
      setErr(describeAiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="col fadein" style={{ gap: 16 }}>
      <section className="col" style={{ gap: 10 }}>
        <h2>Material original</h2>
        {note.sources.length === 0 && <p className="muted small">Esta nota no guarda archivos de origen.</p>}
        {note.sources.map((s) => (
          <SourceRow key={s.id} source={s} />
        ))}
      </section>

      {note.transcript && (
        <section className="card pad col" style={{ gap: 10 }}>
          <div className="row">
            <h3 className="grow">{note.sources.some((s) => s.kind === 'audio' || s.kind === 'video') ? 'Transcripción' : note.sources.some((s) => s.kind === 'youtube') ? 'Contenido del vídeo' : 'Texto'}</h3>
            <button
              className="btn ghost sm"
              onClick={() => {
                void navigator.clipboard.writeText(note.transcript!);
                toast('Copiado');
              }}
            >
              <Copy size={15} /> Copiar
            </button>
          </div>
          <div className="muted" style={{ whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.65, maxHeight: '60vh', overflowY: 'auto' }}>
            {note.transcript}
          </div>
        </section>
      )}

      {!note.course && (note.transcript || note.sources.some((s) => s.kind === 'pdf' || s.kind === 'image')) && (
        <button className="btn secondary" disabled={busy} onClick={() => void regenerate()}>
          {busy ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <RefreshCw size={17} />} {busy ? 'Rehaciendo apuntes…' : 'Rehacer apuntes desde la fuente'}
        </button>
      )}
      {err && <div className="alert bad">{err}</div>}
    </div>
  );
}

function SourceRow({ source }: { source: NoteSource }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    if (source.kind === 'audio' || source.kind === 'video' || source.kind === 'pdf' || source.kind === 'image' || source.kind === 'doc')
      void loadFile(source.id).then((b) => {
        if (b) {
          u = URL.createObjectURL(b);
          setUrl(u);
        }
      });
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [source]);
  return (
    <div className="card pad col" style={{ gap: 10 }}>
      <div className="row">
        <span style={{ fontSize: 24 }}>{ICON[source.kind] ?? '📎'}</span>
        <div className="grow">
          <div className="ellipsis" style={{ fontWeight: 600 }}>{source.name}</div>
          <div className="faint small">{new Date(source.addedAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}</div>
        </div>
        {source.url && (
          <a className="btn ghost sm" href={source.url} target="_blank" rel="noreferrer">
            <ExternalLink size={15} /> Abrir
          </a>
        )}
        {url && source.kind !== 'audio' && source.kind !== 'video' && (
          <a className="btn ghost sm" href={url} target="_blank" rel="noreferrer" download={source.name}>
            <ExternalLink size={15} /> Ver
          </a>
        )}
      </div>
      {url && source.kind === 'audio' && <audio controls src={url} style={{ width: '100%' }} />}
      {url && source.kind === 'video' && <video controls src={url} style={{ width: '100%', borderRadius: 12 }} />}
      {url && source.kind === 'image' && <img src={url} alt={source.name} style={{ width: '100%', borderRadius: 12 }} />}
    </div>
  );
}
