import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, ListChecks, NotebookPen, SendHorizontal, Trash2, Undo2 } from 'lucide-react';
import { useApp } from '../../data/store';
import { addChat, clearChat, markEditUndone, restoreRevision, reviseNote, saveQuiz } from '../../data/actions';
import { createQuiz, LEVEL_LABEL } from '../../data/quizzes';
import { go } from '../../router';
import type { ChatMsg, Note } from '../../data/types';
import Markdown from '../../components/Markdown';
import { isQuizRequest, parseQuizRequest, splitSections } from '../../logic/sections';
import { isEditRequest } from '../../logic/noteEdit';
import { toast } from '../../components/ui';

const SUGGESTIONS = ['Resúmelo en 3 frases', 'Explícamelo como si tuviera 10 años', '¿Qué es lo más probable que caiga en el examen?', 'Quiz sobre el tema 1', 'Añade un ejemplo de la vida real al tema 1'];

const SAVE_REQUEST = 'Guarda en mis apuntes lo que me acabas de explicar, en el tema que corresponda';

export default function ChatTab({ note, onCite }: { note: Note; onCite: (section: string) => void }) {
  const { state, update } = useApp();
  const sections = useMemo(() => splitSections(note.markdown), [note.markdown]);
  const msgs = state.chats[note.id] ?? [];
  const [text, setText] = useState(() => {
    const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('q');
    return q ?? '';
  });
  const [busy, setBusy] = useState<string | null>(null);
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
    setErr('');
    if (isEditRequest(q)) {
      await edit(q, [...msgs, mine].slice(-7, -1));
      return;
    }
    if (isQuizRequest(q)) {
      await quiz(q);
      return;
    }
    setBusy('Pensando…');
    try {
      const { chatReply } = await import('../../ai/tasks');
      const reply = await chatReply(state.settings, note, [...msgs, mine].slice(-16));
      update((s) => addChat(s, note.id, { role: 'assistant', text: reply, at: Date.now() }));
    } catch (e) {
      const { describeAiError } = await import('../../ai/tasks');
      setErr(describeAiError(e));
    } finally {
      setBusy(null);
    }
  };

  /**
   * «quiz sobre el tema 2»: la IA crea un quiz interactivo solo de eso, se guarda en Quizzes
   * y se abre para jugarlo. En el chat queda el enlace para volver a hacerlo.
   */
  const quiz = async (request: string) => {
    const r = parseQuizRequest(request, sections);
    setBusy(r.sections.length ? `Creando tu quiz sobre «${r.focus}»…` : 'Creando tu quiz…');
    try {
      const q = await createQuiz(state.settings, note, { request, level: r.level ?? 'medio', count: r.count ?? 10 });
      const at = Date.now();
      update((s) =>
        addChat(saveQuiz(s, q), note.id, {
          role: 'assistant',
          text: `🎯 **Quiz listo: ${q.title}** · ${q.steps.length} preguntas · nivel ${LEVEL_LABEL[q.level].toLowerCase()}. Queda guardado en **Quizzes** para repetirlo cuando quieras.`,
          at,
          quiz: request,
          quizId: q.id,
        }),
      );
      go(`/quiz/${q.id}?from=chat`);
    } catch (e) {
      const { describeAiError } = await import('../../ai/tasks');
      setErr(describeAiError(e));
    } finally {
      setBusy(null);
    }
  };

  /** Cambia los apuntes con lo que pide («añade un ejemplo al tema 2») y lo cuenta en el chat. */
  const edit = async (request: string, context: ChatMsg[]) => {
    setBusy('Cambiando tus apuntes…');
    try {
      const { editNote } = await import('../../ai/tasks');
      const out = await editNote(state.settings, note, request, context.map(({ role, text }) => ({ role, text })));
      const at = Date.now();
      if (!out) {
        update((s) => addChat(s, note.id, { role: 'assistant', text: 'No he cambiado nada: no he visto qué cambiar en los apuntes. Dime qué añadir, quitar o corregir, por ejemplo «añade un ejemplo al tema 2».', at }));
        return;
      }
      update((s) =>
        addChat(reviseNote(s, note.id, out.markdown, out.change, at), note.id, {
          role: 'assistant',
          text: `✏️ **He actualizado tus apuntes.** ${out.change}`,
          at,
          edit: { revision: at, section: out.section },
        }),
      );
      toast('Apuntes actualizados');
    } catch (e) {
      const { describeAiError } = await import('../../ai/tasks');
      setErr(describeAiError(e));
    } finally {
      setBusy(null);
    }
  };

  const saveReply = (k: number) => {
    if (busy) return;
    const mine: ChatMsg = { role: 'user', text: '📌 Guarda esta respuesta en mis apuntes', at: Date.now() };
    update((s) => addChat(s, note.id, mine));
    setErr('');
    void edit(SAVE_REQUEST, msgs.slice(Math.max(0, k - 3), k + 1));
  };

  const undo = (m: ChatMsg) => {
    if (!m.edit) return;
    const later = (note.revisions ?? []).filter((r) => r.at > m.edit!.revision).length;
    if (later && !confirm(`Después de este cambio hubo ${later} más. Si lo deshaces, los apuntes vuelven a como estaban antes de él (y se pierden también los posteriores). ¿Seguir?`)) return;
    update((s) => markEditUndone(restoreRevision(s, note.id, m.edit!.revision), note.id, m.edit!.revision));
    toast('Cambio deshecho');
  };

  return (
    <div className="col" style={{ gap: 12, minHeight: '55vh' }}>
      {msgs.length === 0 ? (
        <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 10, padding: '20px 4px' }}>
          <div style={{ fontSize: 40 }}>💬</div>
          <h2>Pregúntale a tus apuntes</h2>
          <p className="muted small">La IA responde con tu material delante y te dice de qué sección lo saca. También puedes pedirle quizzes («quiz sobre el tema 2») o que mejore tus apuntes («añade un ejemplo al tema 2», «corrige…»).</p>
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
              {m.quiz && (
                <button
                  className="btn sm"
                  style={{ marginTop: 8 }}
                  disabled={!!busy}
                  onClick={() => (m.quizId && state.quizzes.some((x) => x.id === m.quizId) ? go(`/quiz/${m.quizId}?from=chat`) : void quiz(m.quiz!))}
                >
                  <ListChecks size={16} /> {m.quizId ? 'Jugar este quiz' : 'Crear este quiz'}
                </button>
              )}
              {m.edit && (
                <div className="row wrap" style={{ gap: 8, marginTop: 8 }}>
                  {m.edit.undone ? (
                    <span className="tag">Cambio deshecho</span>
                  ) : (
                    <>
                      <button className="btn sm" onClick={() => onCite(m.edit!.section ?? '')}>
                        <Eye size={16} /> Ver en apuntes
                      </button>
                      <button className="btn ghost sm" onClick={() => undo(m)}>
                        <Undo2 size={16} /> Deshacer
                      </button>
                    </>
                  )}
                </div>
              )}
              {!m.quiz && !m.edit && !m.text.startsWith('No he cambiado nada') && (
                <button className="btn ghost sm" style={{ marginTop: 6, marginLeft: -8 }} onClick={() => saveReply(k)} disabled={!!busy}>
                  <NotebookPen size={15} /> Guardar en apuntes
                </button>
              )}
            </div>
          ),
        )}
        {busy && (
          <div className="bubble ai row" style={{ gap: 8 }}>
            <div className="spinner" style={{ width: 16, height: 16 }} /> <span className="muted small">{busy}</span>
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
          placeholder="Pregunta, pide un quiz o un cambio…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send(text);
            }
          }}
        />
        <button type="submit" className="btn" style={{ width: 46, height: 46, padding: 0, minHeight: 46 }} aria-label="Enviar" disabled={!!busy || !text.trim()}>
          <SendHorizontal size={20} />
        </button>
      </form>
    </div>
  );
}
