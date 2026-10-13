import { useState } from 'react';
import { BookOpen, Download, FileText, FolderInput, GraduationCap, Headphones, Layers, ListChecks, MessageCircle, MoreVertical, Pencil, Printer, Share2, Trash2 } from 'lucide-react';
import { useApp } from '../../data/store';
import { deleteNote, moveNote, updateNote } from '../../data/actions';
import { go } from '../../router';
import { Sheet, Tabs, TopBar, toast } from '../../components/ui';
import { FOLDER_COLORS } from '../Home';
import NotesTab from './NotesTab';
import CardsTab from './CardsTab';
import QuizTab from './QuizTab';
import ChatTab from './ChatTab';
import PodcastTab from './PodcastTab';
import SourceTab from './SourceTab';
import LessonsTab from './LessonsTab';

export type NoteTab = 'apuntes' | 'lecciones' | 'tarjetas' | 'quiz' | 'chat' | 'podcast' | 'fuente';

export default function NoteScreen({ id, tab: initial }: { id: string; tab?: string }) {
  const { state, update } = useApp();
  const note = state.notes.find((n) => n.id === id);
  const valid: NoteTab[] = ['apuntes', 'tarjetas', 'quiz', 'chat', 'podcast', 'fuente', ...(note?.course ? (['lecciones'] as const) : [])];
  const [tab, setTabState] = useState<NoteTab>(valid.includes(initial as NoteTab) ? (initial as NoteTab) : note?.course ? 'lecciones' : 'apuntes');
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState<null | 'rename' | 'move'>(null);
  const [quizRequest, setQuizRequest] = useState<{ text: string; key: number } | undefined>();

  if (!note)
    return (
      <div className="app">
        <TopBar back="#/" />
        <main className="page">
          <p className="muted">Esta nota ya no existe.</p>
        </main>
      </div>
    );

  const setTab = (t: NoteTab) => {
    setTabState(t);
    if (t !== 'quiz') setQuizRequest(undefined);
    window.history.replaceState(null, '', `#/nota/${id}?tab=${t}`);
  };

  const tabs: { id: NoteTab; label: string; icon: React.ReactNode }[] = [
    ...(note.course ? [{ id: 'lecciones' as const, label: 'Lecciones', icon: <GraduationCap size={17} /> }] : []),
    { id: 'apuntes', label: 'Apuntes', icon: <BookOpen size={17} /> },
    { id: 'tarjetas', label: 'Tarjetas', icon: <Layers size={17} /> },
    { id: 'quiz', label: 'Quiz', icon: <ListChecks size={17} /> },
    { id: 'chat', label: 'Chat', icon: <MessageCircle size={17} /> },
    { id: 'podcast', label: 'Pódcast', icon: <Headphones size={17} /> },
    { id: 'fuente', label: 'Fuente', icon: <FileText size={17} /> },
  ];

  const exportMd = () => {
    const md = `# ${note.emoji} ${note.title}\n\n> ${note.summary}\n\n${note.markdown}\n`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = `${note.title.replace(/[\\/:*?"<>|]+/g, '')}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const share = async () => {
    const text = `${note.emoji} ${note.title}\n\n${note.summary}\n\n${note.markdown}`;
    try {
      if (navigator.share) await navigator.share({ title: note.title, text });
      else {
        await navigator.clipboard.writeText(text);
        toast('Apuntes copiados');
      }
    } catch {
      // cancelado
    }
  };

  return (
    <div className="app">
      <TopBar back="#/" title={<span>{note.emoji} {note.title}</span>}>
        <div style={{ position: 'relative' }}>
          <button className="iconbtn" aria-label="Más opciones" aria-expanded={menu} onClick={() => setMenu((x) => !x)}>
            <MoreVertical size={22} />
          </button>
          {menu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 35 }} onClick={() => setMenu(false)} />
              <div className="menu" role="menu" onClick={() => setMenu(false)}>
                <button onClick={() => setSheet('rename')}>
                  <Pencil size={18} /> Renombrar
                </button>
                <button onClick={() => setSheet('move')}>
                  <FolderInput size={18} /> Mover a carpeta
                </button>
                <button onClick={() => void share()}>
                  <Share2 size={18} /> Compartir
                </button>
                <button onClick={exportMd}>
                  <Download size={18} /> Descargar (Markdown)
                </button>
                <button
                  onClick={() => {
                    setTab('apuntes');
                    window.setTimeout(() => window.print(), 300);
                  }}
                >
                  <Printer size={18} /> Imprimir o guardar PDF
                </button>
                <button
                  className="danger"
                  onClick={() => {
                    if (!confirm(`¿Borrar «${note.title}» con sus tarjetas y su chat?`)) return;
                    update((s) => deleteNote(s, id));
                    go('/');
                  }}
                >
                  <Trash2 size={18} /> Borrar nota
                </button>
              </div>
            </>
          )}
        </div>
      </TopBar>
      <main className="page" style={{ gap: 16 }}>
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
        {tab === 'apuntes' && <NotesTab note={note} onChat={() => setTab('chat')} />}
        {tab === 'lecciones' && note.course && <LessonsTab note={note} />}
        {tab === 'tarjetas' && <CardsTab note={note} />}
        {tab === 'quiz' && <QuizTab note={note} request={quizRequest} />}
        {tab === 'chat' && (
          <ChatTab
            note={note}
            onCite={(sec) => {
              setTab('apuntes');
              window.setTimeout(() => {
                const el = sec ? document.getElementById(sec) : null;
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                el?.classList.add('flash');
                window.setTimeout(() => el?.classList.remove('flash'), 2200);
              }, 120);
            }}
            onQuiz={(text) => {
              setQuizRequest({ text, key: Date.now() });
              setTab('quiz');
            }}
          />
        )}
        {tab === 'podcast' && <PodcastTab note={note} />}
        {tab === 'fuente' && <SourceTab note={note} />}
      </main>

      {sheet === 'rename' && <RenameSheet id={id} onClose={() => setSheet(null)} />}
      {sheet === 'move' && (
        <Sheet title="Mover a carpeta" onClose={() => setSheet(null)}>
          <div className="col" style={{ gap: 8 }}>
            <button className="card click pad" aria-pressed={!note.folderId} onClick={() => (update((s) => moveNote(s, id, undefined)), setSheet(null))}>
              Sin carpeta {!note.folderId && '✓'}
            </button>
            {state.folders.map((f) => (
              <button key={f.id} className="card click pad" onClick={() => (update((s) => moveNote(s, id, f.id)), setSheet(null))}>
                <span style={{ color: FOLDER_COLORS[f.color] }}>●</span> {f.name} {note.folderId === f.id && '✓'}
              </button>
            ))}
            {state.folders.length === 0 && <p className="muted small">Aún no tienes carpetas: créalas desde la pantalla de inicio.</p>}
          </div>
        </Sheet>
      )}
    </div>
  );
}

function RenameSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, update } = useApp();
  const note = state.notes.find((n) => n.id === id)!;
  const [title, setTitle] = useState(note.title);
  const [emoji, setEmoji] = useState(note.emoji);
  return (
    <Sheet title="Renombrar" onClose={onClose}>
      <div className="row">
        <input className="field" style={{ width: 70, textAlign: 'center', fontSize: 24 }} value={emoji} onChange={(e) => setEmoji(e.target.value)} aria-label="Emoji" />
        <input className="field grow" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Título" />
      </div>
      <button
        className="btn block"
        disabled={!title.trim()}
        onClick={() => {
          update((s) => updateNote(s, id, { title: title.trim(), emoji: [...emoji.trim()][0] ?? note.emoji }));
          onClose();
        }}
      >
        Guardar
      </button>
    </Sheet>
  );
}
