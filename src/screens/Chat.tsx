import { useEffect, useRef, useState } from 'react';
import { useApp } from '../data/store';
import { addChat, clearChat, studyCards } from '../data/actions';
import { Header, icon } from '../components/ui';
import { Missing } from './StudyView';

export default function Chat({ id, initial }: { id: string; initial: string }) {
  const { state, update } = useApp();
  const study = state.studies.find((s) => s.id === id);
  const msgs = state.chats[id] ?? [];
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [msgs.length, busy]);
  if (!study) return <Missing />;

  const send = async () => {
    const q = text.trim();
    if (!q || busy) return;
    setText('');
    setErr('');
    const mine = { role: 'user' as const, text: q, at: Date.now() };
    update((s) => addChat(s, id, mine));
    setBusy(true);
    try {
      const cards = studyCards(state, id)
        .slice(0, 80)
        .map((c) => `- ${c.front}: ${c.back}`)
        .join('\n');
      const context = `Estudio: ${study.name}\n${study.summary ? `Resumen:\n${study.summary.slice(0, 12000)}\n` : ''}${cards ? `Tarjetas:\n${cards}` : ''}`;
      const { chatReply } = await import('../ai/claude');
      const reply = await chatReply(state.settings, context, [...msgs, mine].slice(-20));
      update((s) => addChat(s, id, { role: 'assistant', text: reply, at: Date.now() }));
    } catch (e) {
      const { describeAiError } = await import('../ai/claude');
      setErr(describeAiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen" style={{ paddingBottom: 24 }}>
      <Header back={study.course ? `#/curso/${id}` : `#/estudio/${id}`} title="Asistente">
        {msgs.length > 0 && (
          <button className="btn ghost" style={{ minHeight: 36, padding: '4px 10px', fontSize: 13 }} onClick={() => confirm('¿Borrar la conversación?') && update((s) => clearChat(s, id))}>
            Borrar
          </button>
        )}
      </Header>
      <div className="row muted" style={{ fontSize: 14 }}>
        <img src={icon('ai')} alt="" width={28} height={28} />
        Pregúntame lo que quieras de «{study.name}».
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        {msgs.map((m, k) => (
          <div
            key={k}
            className={m.role === 'user' ? 'lcd' : 'px'}
            style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', padding: '12px 14px', fontFamily: 'var(--f-body)', fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-wrap', color: m.role === 'user' ? 'var(--text)' : undefined }}
          >
            {m.text}
          </div>
        ))}
        {busy && (
          <div className="px" style={{ alignSelf: 'flex-start', padding: '12px 14px', fontSize: 15 }} role="status">
            Pensando…
          </div>
        )}
        <div ref={end} />
      </div>
      {err && (
        <div className="lcd toast" role="status" style={{ color: 'var(--coral)', fontSize: 18 }}>
          {err}
        </div>
      )}
      <form
        className="row"
        style={{ position: 'sticky', bottom: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label className="sr" htmlFor="ask">
          Tu pregunta
        </label>
        <input id="ask" className="field grow" value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe tu pregunta…" autoFocus={!!initial} />
        <button type="submit" className="btn" aria-label="Enviar" disabled={busy || !text.trim()} style={{ width: 54, padding: 0 }}>
          <img src={icon('send')} alt="" width={24} height={24} style={{ filter: 'invert(1)' }} />
        </button>
      </form>
    </main>
  );
}
