import { useMemo, useState } from 'react';
import { Check, History, ListTree, MessageCircle, Pencil, Sparkles, Undo2, Wand2 } from 'lucide-react';
import { useApp } from '../../data/store';
import { restoreRevision, reviseNote } from '../../data/actions';
import { outline } from '../../logic/markdown';
import type { Note } from '../../data/types';
import type { NoteAction } from '../../ai/tasks';
import Markdown from '../../components/Markdown';
import { Sheet, timeAgo, toast } from '../../components/ui';

const ACTIONS: { id: NoteAction; label: string; emoji: string; text: string }[] = [
  { id: 'simplificar', label: 'Más fácil', emoji: '🧒', text: 'Explicado más sencillo y corto' },
  { id: 'ampliar', label: 'Más detalle', emoji: '🔬', text: 'Más profundo, con más explicación' },
  { id: 'ejemplos', label: 'Con ejemplos', emoji: '🧪', text: 'Añade ejemplos y ejercicios resueltos' },
  { id: 'traducir', label: 'Traducir', emoji: '🌍', text: 'A otro idioma' },
];

const ACTION_REASON: Record<NoteAction, string> = { simplificar: 'Apuntes simplificados', ampliar: 'Apuntes ampliados con más detalle', ejemplos: 'Añadidos ejemplos', traducir: 'Apuntes traducidos' };

export default function NotesTab({ note, onChat }: { note: Note; onChat?: () => void }) {
  const { state, update } = useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.markdown);
  const [busy, setBusy] = useState<NoteAction | null>(null);
  const [undo, setUndo] = useState<string | null>(null);
  const [aiSheet, setAiSheet] = useState(false);
  const [toc, setToc] = useState(false);
  const [historySheet, setHistorySheet] = useState(false);
  const [lang, setLang] = useState('inglés');
  const sections = useMemo(() => outline(note.markdown), [note.markdown]);

  const run = async (a: NoteAction) => {
    setAiSheet(false);
    setBusy(a);
    try {
      const { transformNote } = await import('../../ai/tasks');
      const md = await transformNote(state.settings, note, a, lang);
      if (md.length < 40) throw new Error('La respuesta llegó vacía.');
      setUndo(note.markdown);
      update((s) => reviseNote(s, note.id, md, a === 'traducir' ? `Apuntes traducidos al ${lang}` : ACTION_REASON[a]));
      toast('Apuntes actualizados');
    } catch (e) {
      const { describeAiError } = await import('../../ai/tasks');
      toast(describeAiError(e));
    } finally {
      setBusy(null);
    }
  };

  if (editing)
    return (
      <div className="col fadein">
        <div className="alert info small">Edita en Markdown: «## » para títulos, «- » para listas, **negrita**, $fórmulas$ y tablas.</div>
        <textarea className="field" style={{ minHeight: '60vh', fontFamily: 'var(--mono)', fontSize: 14 }} value={draft} onChange={(e) => setDraft(e.target.value)} />
        <div className="row">
          <button className="btn ghost grow" onClick={() => (setDraft(note.markdown), setEditing(false))}>
            Cancelar
          </button>
          <button
            className="btn grow"
            onClick={() => {
              setUndo(note.markdown);
              update((s) => reviseNote(s, note.id, draft, 'Editado a mano'));
              setEditing(false);
            }}
          >
            <Check size={18} /> Guardar
          </button>
        </div>
      </div>
    );

  return (
    <div className="col fadein" style={{ gap: 16 }}>
      {note.summary && (
        <section className="card pad col" style={{ gap: 10, background: 'linear-gradient(135deg, var(--accent-soft), var(--violet-soft))' }}>
          <div className="row" style={{ gap: 8 }}>
            <Sparkles size={18} color="var(--accent)" />
            <h3>Resumen</h3>
          </div>
          <p style={{ lineHeight: 1.6 }}>{note.summary}</p>
          {note.keyPoints.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {note.keyPoints.map((k, i) => (
                <li key={i} style={{ margin: '4px 0' }}>
                  {k}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="row wrap" style={{ gap: 8 }}>
        <button className="btn secondary sm" onClick={() => setAiSheet(true)} disabled={!!busy}>
          {busy ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Wand2 size={16} />} {busy ? 'Reescribiendo…' : 'Mejorar con IA'}
        </button>
        {sections.length > 2 && (
          <button className="btn secondary sm" onClick={() => setToc((x) => !x)}>
            <ListTree size={16} /> Índice
          </button>
        )}
        <button className="btn secondary sm" onClick={() => (setDraft(note.markdown), setEditing(true))}>
          <Pencil size={16} /> Editar
        </button>
        {(note.revisions?.length ?? 0) > 0 && (
          <button className="btn secondary sm" onClick={() => setHistorySheet(true)}>
            <History size={16} /> Versiones
          </button>
        )}
        {onChat && (
          <button className="btn ghost sm" onClick={onChat}>
            <MessageCircle size={16} /> Cambiar con el chat
          </button>
        )}
        {undo !== null && (
          <button
            className="btn ghost sm"
            onClick={() => {
              update((s) => reviseNote(s, note.id, undo, 'Deshecho el último cambio'));
              setUndo(null);
            }}
          >
            <Undo2 size={16} /> Deshacer
          </button>
        )}
      </div>

      {toc && (
        <nav className="card pad col fadein" style={{ gap: 4 }} aria-label="Índice">
          {sections.map((s, i) => (
            <a key={i} href={`#${s.id}`} onClick={(e) => (e.preventDefault(), document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }))} style={{ paddingLeft: s.level === 3 ? 16 : 0, color: s.level === 3 ? 'var(--muted)' : 'var(--text)', padding: '5px 0', fontSize: 15 }}>
              {s.level === 2 && <span className="muted small">Tema {sections.slice(0, i + 1).filter((x) => x.level === 2).length} · </span>}
              {s.text}
            </a>
          ))}
        </nav>
      )}

      <article className="card pad" style={{ padding: '22px 20px' }}>
        {note.markdown.trim() ? <Markdown text={note.markdown} /> : <p className="muted">Esta nota aún no tiene apuntes. Pulsa «Editar» para escribirlos.</p>}
      </article>

      {historySheet && (
        <Sheet title="Versiones de tus apuntes" onClose={() => setHistorySheet(false)}>
          <p className="muted small">Cada cambio (desde el chat, «Mejorar con IA» o editando a mano) guarda cómo estaban antes. Puedes volver a cualquiera; la versión actual también se guarda.</p>
          {[...(note.revisions ?? [])].reverse().map((r) => (
            <div key={r.at} className="card pad row" style={{ gap: 10 }}>
              <span className="grow col" style={{ gap: 2, minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>{r.reason}</span>
                <span className="muted small">{timeAgo(r.at)}</span>
              </span>
              <button
                className="btn secondary sm"
                onClick={() => {
                  update((s) => restoreRevision(s, note.id, r.at));
                  setHistorySheet(false);
                  toast('Apuntes restaurados');
                }}
              >
                <Undo2 size={15} /> Volver a antes
              </button>
            </div>
          ))}
        </Sheet>
      )}

      {aiSheet && (
        <Sheet title="Mejorar con IA" onClose={() => setAiSheet(false)}>
          <p className="muted small">La IA reescribe tus apuntes. Si no te gusta el resultado, pulsa «Deshacer».</p>
          {ACTIONS.map((a) => (
            <button key={a.id} className="card click pad row" style={{ gap: 14 }} onClick={() => void run(a.id)}>
              <span style={{ fontSize: 26 }}>{a.emoji}</span>
              <span className="grow">
                <span style={{ display: 'block', fontWeight: 650 }}>{a.label}</span>
                <span className="muted small">{a.text}</span>
              </span>
            </button>
          ))}
          <label className="row small">
            <span className="muted">Idioma para traducir:</span>
            <select className="field" style={{ width: 'auto', padding: '6px 10px' }} value={lang} onChange={(e) => setLang(e.target.value)}>
              {['inglés', 'español', 'francés', 'alemán', 'italiano', 'portugués', 'catalán', 'japonés', 'chino'].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        </Sheet>
      )}
    </div>
  );
}
