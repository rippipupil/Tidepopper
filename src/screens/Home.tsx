import { useMemo, useRef, useState } from 'react';
import { FileUp, FolderPlus, GraduationCap, Mic, MoreHorizontal, RotateCcw, Search, Type, X, MonitorPlay } from 'lucide-react';
import { useApp } from '../data/store';
import { addFolder, deleteFolder, renameFolder } from '../data/actions';
import { uid } from '../data/db';
import { dismissJob, retryJob, startJob, useJobs } from '../data/jobs';
import { youtubeUrl } from '../data/ingest';
import { go } from '../router';
import type { FolderColor, Note } from '../data/types';
import { BottomNav, Sheet, TopBar, timeAgo, toast } from '../components/ui';
import { dueCount, memoryOf } from '../logic/learn';

export const FOLDER_COLORS: Record<FolderColor, string> = { sky: '#6cc4ff', violet: '#a594ff', mint: '#4fd1a5', amber: '#ffc86b', rose: '#ff8fa3', slate: '#94a1b8' };

const SOURCE_ICON: Record<string, string> = { pdf: '📄', image: '🖼️', text: '✍️', audio: '🎙️', video: '🎬', youtube: '▶️', doc: '📃', topic: '🧭' };

type SheetKind = null | 'youtube' | 'text' | 'folder';

export default function Home() {
  const { state, update } = useApp();
  const jobs = useJobs();
  const [folder, setFolder] = useState<string | 'all'>('all');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const now = Date.now();
  const folderId = folder === 'all' ? undefined : folder;

  const notes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.notes
      .filter((n) => folder === 'all' || n.folderId === folder)
      .filter((n) => !q || n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q) || n.markdown.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [state.notes, folder, query]);

  const due = dueCount(state.cards, now);
  const create = (input: Parameters<typeof startJob>[0]) => {
    startJob(input, state.settings, update, folderId);
    toast('Creando tus apuntes…');
  };

  return (
    <div className="app">
      <TopBar>
        <button className="iconbtn" aria-label="Buscar" onClick={() => setSearching((x) => !x)}>
          {searching ? <X size={22} /> : <Search size={22} />}
        </button>
      </TopBar>
      <main className="page">
        {searching && (
          <div className="search fadein">
            <Search size={18} />
            <input className="field" autoFocus placeholder="Buscar en tus notas…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        )}

        {!searching && (
          <section className="hero col" style={{ gap: 16 }}>
            <div>
              <h1>¿Qué quieres aprender hoy?</h1>
              <p className="muted" style={{ marginTop: 4 }}>
                Sube tu material y la IA te hace apuntes, tarjetas, quiz y un pódcast.
              </p>
            </div>
            <div className="create">
              <CreateBtn icon={<Mic size={22} />} color="var(--bad)" title="Grabar clase" text="Graba y transcribe" onClick={() => go('/grabar')} />
              <CreateBtn icon={<FileUp size={22} />} color="var(--accent)" title="Subir archivo" text="PDF, fotos, Word, audio…" onClick={() => fileIn.current?.click()} />
              <CreateBtn icon={<MonitorPlay size={22} />} color="#ff5c5c" title="YouTube" text="Pega un enlace" onClick={() => setSheet('youtube')} />
              <CreateBtn icon={<Type size={22} />} color="var(--good)" title="Pegar texto" text="Apuntes, artículos…" onClick={() => setSheet('text')} />
              <CreateBtn icon={<GraduationCap size={22} />} color="var(--violet)" title="Aprender un tema" text="Curso por niveles" onClick={() => go('/tema')} />
            </div>
            <input
              ref={fileIn}
              type="file"
              hidden
              multiple
              accept="application/pdf,image/*,audio/*,video/*,.docx,.pptx,.txt,.md,text/*"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                e.target.value = '';
                if (files.length) create({ kind: 'files', files });
              }}
            />
          </section>
        )}

        {due > 0 && !searching && (
          <a href="#/repasar" className="card click pad row" style={{ gap: 14 }}>
            <span style={{ fontSize: 28 }}>🔁</span>
            <div className="grow">
              <div style={{ fontWeight: 650 }}>Tienes {due} tarjeta{due === 1 ? '' : 's'} para repasar</div>
              <div className="muted small">Repasar justo a tiempo es la forma más rápida de no olvidar.</div>
            </div>
            <span className="btn sm">Repasar</span>
          </a>
        )}

        {jobs.map((j) => (
          <div key={j.id} className="card pad col fadein" style={{ gap: 10 }}>
            <div className="row">
              {j.error ? <span style={{ fontSize: 24 }}>⚠️</span> : j.done ? <span style={{ fontSize: 24 }}>✅</span> : <div className="spinner" />}
              <div className="grow">
                <div className="ellipsis" style={{ fontWeight: 600 }}>{j.title}</div>
                <div className="muted small">{j.error ?? j.status}</div>
              </div>
              {j.done && (
                <button className="btn sm" onClick={() => go(`/nota/${j.id}`)}>
                  Abrir
                </button>
              )}
              {j.error && (
                <>
                  <button className="iconbtn filled" aria-label="Reintentar" onClick={() => retryJob(j.id, state.settings, update)}>
                    <RotateCcw size={18} />
                  </button>
                  <button className="iconbtn" aria-label="Descartar" onClick={() => dismissJob(j.id)}>
                    <X size={18} />
                  </button>
                </>
              )}
            </div>
            {!j.error && !j.done && <div className="bar"><span style={{ width: `${Math.round(j.progress * 100)}%`, background: 'var(--accent)' }} /></div>}
          </div>
        ))}

        <section className="col" style={{ gap: 12 }}>
          <div className="row">
            <h2 className="grow">{searching && query ? `Resultados (${notes.length})` : 'Mis notas'}</h2>
            <button className="iconbtn" aria-label="Nueva carpeta" onClick={() => setSheet('folder')}>
              <FolderPlus size={21} />
            </button>
          </div>
          {state.folders.length > 0 && (
            <div className="row" style={{ overflowX: 'auto', paddingBottom: 4, gap: 8 }}>
              <button className="chip" aria-pressed={folder === 'all'} onClick={() => setFolder('all')}>
                Todas · {state.notes.length}
              </button>
              {state.folders.map((f) => (
                <FolderChip key={f.id} id={f.id} active={folder === f.id} onPick={() => setFolder(f.id)} onDeleted={() => setFolder('all')} />
              ))}
            </div>
          )}

          {notes.length === 0 ? (
            <div className="card pad col" style={{ alignItems: 'center', textAlign: 'center', gap: 8, padding: 28 }}>
              <div style={{ fontSize: 40 }}>{query ? '🔍' : '✨'}</div>
              <div style={{ fontWeight: 600 }}>{query ? 'No hay notas que coincidan' : folder === 'all' ? 'Aún no tienes notas' : 'Esta carpeta está vacía'}</div>
              {!query && <div className="muted small">Crea la primera con los botones de arriba: tarda menos de un minuto.</div>}
            </div>
          ) : (
            <div className="notes">
              {notes.map((n) => (
                <NoteCard key={n.id} note={n} />
              ))}
            </div>
          )}
        </section>
      </main>

      {sheet === 'youtube' && <YoutubeSheet onClose={() => setSheet(null)} onCreate={(url) => create({ kind: 'youtube', url })} />}
      {sheet === 'text' && <TextSheet onClose={() => setSheet(null)} onCreate={(text, title) => create({ kind: 'text', text, title })} />}
      {sheet === 'folder' && (
        <FolderSheet
          onClose={() => setSheet(null)}
          onCreate={(name, color) => {
            const id = uid();
            update((s) => addFolder(s, id, name, color, Date.now()));
            setFolder(id);
          }}
        />
      )}
      <BottomNav active="inicio" due={due} />
    </div>
  );
}

function CreateBtn({ icon, color, title, text, onClick }: { icon: React.ReactNode; color: string; title: string; text: string; onClick: () => void }) {
  return (
    <button className="card click" onClick={onClick}>
      <span className="ico" style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}>
        {icon}
      </span>
      <span>
        <span style={{ display: 'block', fontWeight: 650, fontSize: 15 }}>{title}</span>
        <span className="muted small">{text}</span>
      </span>
    </button>
  );
}

function NoteCard({ note }: { note: Note }) {
  const { state } = useApp();
  const cards = state.cards.filter((c) => c.noteId === note.id);
  const mem = memoryOf(cards);
  const folder = state.folders.find((f) => f.id === note.folderId);
  const kind = note.course ? 'topic' : note.sources[0]?.kind;
  return (
    <a href={`#/nota/${note.id}`} className="card click note-card">
      <span className="note-emoji">{note.emoji}</span>
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="ellipsis" style={{ display: 'block', fontWeight: 650 }}>
          {note.title}
        </span>
        <span className="muted small" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {note.summary || 'Sin resumen'}
        </span>
        <span className="row wrap" style={{ gap: 6, marginTop: 8 }}>
          {kind && <span className="tag pill-accent">{SOURCE_ICON[kind]} {note.course ? 'Curso' : kind === 'youtube' ? 'YouTube' : kind === 'audio' ? 'Audio' : kind.toUpperCase() === 'PDF' ? 'PDF' : kind === 'doc' ? 'Documento' : kind === 'image' ? 'Foto' : kind === 'video' ? 'Vídeo' : 'Texto'}</span>}
          {cards.length > 0 && <span className={`tag ${mem >= 70 ? 'pill-good' : mem >= 30 ? 'pill-warn' : 'pill-bad'}`}>🧠 {mem}%</span>}
          {folder && <span className="tag" style={{ color: FOLDER_COLORS[folder.color], background: 'var(--surface-2)' }}>● {folder.name}</span>}
          <span className="faint small">{timeAgo(note.updatedAt)}</span>
        </span>
      </span>
    </a>
  );
}

function FolderChip({ id, active, onPick, onDeleted }: { id: string; active: boolean; onPick: () => void; onDeleted: () => void }) {
  const { state, update } = useApp();
  const f = state.folders.find((x) => x.id === id)!;
  const count = state.notes.filter((n) => n.folderId === id).length;
  return (
    <span className="row" style={{ gap: 2 }}>
      <button className="chip" aria-pressed={active} onClick={onPick}>
        <span style={{ color: FOLDER_COLORS[f.color] }}>●</span> {f.name} · {count}
      </button>
      {active && (
        <button
          className="iconbtn"
          style={{ width: 32, height: 32 }}
          aria-label="Opciones de la carpeta"
          onClick={() => {
            const name = prompt('Nombre de la carpeta (vacío para borrarla):', f.name);
            if (name === null) return;
            if (!name.trim()) {
              if (confirm(`¿Borrar la carpeta «${f.name}»? Sus notas no se borran.`)) {
                update((s) => deleteFolder(s, id));
                onDeleted();
              }
            } else update((s) => renameFolder(s, id, name));
          }}
        >
          <MoreHorizontal size={18} />
        </button>
      )}
    </span>
  );
}

function YoutubeSheet({ onClose, onCreate }: { onClose: () => void; onCreate: (url: string) => void }) {
  const [url, setUrl] = useState('');
  const ok = youtubeUrl(url);
  return (
    <Sheet title="Vídeo de YouTube" onClose={onClose}>
      <p className="muted small">Pega el enlace de un vídeo público. La IA lo ve entero y te hace los apuntes (necesita la clave gratis de Gemini).</p>
      <input className="field" autoFocus inputMode="url" placeholder="https://youtube.com/watch?v=…" value={url} onChange={(e) => setUrl(e.target.value)} />
      {url && !ok && <div className="alert bad">Ese enlace no parece de YouTube.</div>}
      <button
        className="btn block"
        disabled={!ok}
        onClick={() => {
          onCreate(ok!);
          onClose();
        }}
      >
        Crear apuntes
      </button>
    </Sheet>
  );
}

function TextSheet({ onClose, onCreate }: { onClose: () => void; onCreate: (text: string, title: string) => void }) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  return (
    <Sheet title="Pegar texto" onClose={onClose}>
      <input className="field" placeholder="Título (opcional)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="field" autoFocus rows={9} placeholder="Pega aquí tus apuntes, un artículo, un tema…" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="faint small">{text.trim().split(/\s+/).filter(Boolean).length} palabras</div>
      <button
        className="btn block"
        disabled={text.trim().length < 40}
        onClick={() => {
          onCreate(text, title);
          onClose();
        }}
      >
        Crear apuntes
      </button>
    </Sheet>
  );
}

function FolderSheet({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, color: FolderColor) => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<FolderColor>('sky');
  return (
    <Sheet title="Nueva carpeta" onClose={onClose}>
      <input className="field" autoFocus placeholder="Ej.: Biología" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="row" style={{ gap: 12 }}>
        {(Object.keys(FOLDER_COLORS) as FolderColor[]).map((c) => (
          <button
            key={c}
            aria-label={c}
            aria-pressed={color === c}
            onClick={() => setColor(c)}
            style={{ width: 34, height: 34, borderRadius: 99, border: color === c ? '3px solid var(--text)' : '3px solid transparent', background: FOLDER_COLORS[c], cursor: 'pointer' }}
          />
        ))}
      </div>
      <button
        className="btn block"
        disabled={!name.trim()}
        onClick={() => {
          onCreate(name, color);
          onClose();
        }}
      >
        Crear carpeta
      </button>
    </Sheet>
  );
}
