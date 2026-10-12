import { useEffect, useRef, useState } from 'react';
import { SendHorizontal, Trash2 } from 'lucide-react';
import { useApp } from '../../data/store';
import { addChat, clearChat } from '../../data/actions';
import type { ChatMsg, Note } from '../../data/types';
import Markdown from '../../components/Markdown';

const SUGGESTIONS = ['Resúmelo en 3 frases', 'Explícamelo como si tuviera 10 años', 'Ponme un ejemplo de la vida real', '¿Qué es lo más probable que caiga en el examen?', 'Hazme 3 preguntas para comprobar si lo entiendo'];

export default function ChatTab({ note, onCite }: { note: Note; onCite: (section: string) => void }) {
  const { state, update } = useApp();
  const msgs = state.chats[note.id] ?? [];
  const [text, setText] = useState(() => {
    const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('q');
    return q ?? '';
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs.length, busy]);

  const send = async (raw: string) => {
    const q = raw.trim();
    if (!q || busy) return;
    const mine: ChatMsg = { role: 'user', text: q, at: Date.now() };
    update((s) => addChat(s, note.id, mine));
    setText('');
    setBusy(true);
    setErr('');
    try {
      const { chatReply } = await import('../../ai/tasks');
      const reply = await chatReply(state.settings, note, [...msgs, mine].slice(-16));
      update((s) => addChat(s, note.id, { role: 'assistant', text: reply, at: Date.now() }));
    } catch (e) {
      const { describeAiError } = await import('../../ai/tasks');
      setErr(describeAiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="col" style={{ gap: 12, minHeight: '55vh' }}>
      {msgs.length === 0 ? (
        <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 10, padding: '20px 4px' }}>
          <div style={{ fontSize: 40 }}>💬</div>
          <h2>Pregúntale a tus apuntes</h2>
          <p className="muted small">La IA responde con tu material delante y te dice de qué sección lo saca.</p>
          <div className="row wrap" style={{ justifyContent: 'center', gap: 8, marginTop: 6 }}>
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chip" onClick={() => void send(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn ghost sm" onClick={() => confirm('¿Borrar la conversación?') && update((s) => clearChat(s, note.id))}>
            <Trash2 size={15} /> Borrar chat
          </button>
        </div>
      )}
      <div className="col" style={{ gap: 10 }}>
        {msgs.map((m, k) =>
          m.role === 'user' ? (
            <div key={k} className="bubble me">
              {m.text}
            </div>
          ) : (
            <div key={k} className="bubble ai">
              <Markdown text={m.text} onCite={onCite} />
            </div>
          ),
        )}
        {busy && (
          <div className="bubble ai row" style={{ gap: 8 }}>
            <div className="spinner" style={{ width: 16, height: 16 }} /> <span className="muted small">Pensando…</span>
          </div>
        )}
        {err && <div className="alert bad">{err}</div>}
        <div ref={end} />
      </div>
      <form
        className="composer"
        style={{ marginTop: 'auto' }}
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
      >
        <label className="sr" htmlFor="ask">
          Tu pregunta
        </label>
        <textarea
          id="ask"
          rows={1}
          value={text}
          placeholder="Pregunta lo que quieras…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send(text);
            }
          }}
        />
        <button type="submit" className="btn" style={{ width: 46, height: 46, padding: 0, minHeight: 46 }} aria-label="Enviar" disabled={busy || !text.trim()}>
          <SendHorizontal size={20} />
        </button>
      </form>
    </div>
  );
}
