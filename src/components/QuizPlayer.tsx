// Jugar un quiz guardado: una pregunta interactiva cada vez (test, V/F, huecos, escribir, ordenar,
// parejas), con pista y explicación; al final la nota, tus fallos y cómo seguir.
import { useState } from 'react';
import { Lightbulb, NotebookPen, RotateCcw, Sparkles, Target } from 'lucide-react';
import { useApp } from '../data/store';
import { recordAttempt, reviseNote } from '../data/actions';
import { encourage, praise } from '../logic/lesson';
import { splitSections } from '../logic/sections';
import type { LessonStep, Note, SavedQuiz } from '../data/types';
import { StepView } from './Steps';
import { toast } from './ui';

export const answerText = (s: LessonStep) =>
  s.type === 'elige' || s.type === 'hueco'
    ? s.options[s.answer]
    : s.type === 'vf'
      ? s.answer
        ? 'Verdadero'
        : 'Falso'
      : s.type === 'escribe'
        ? s.accepted[0]
        : s.type === 'ordena'
          ? s.options.join(' → ')
          : s.pairs.map((p) => `${p.a} = ${p.b}`).join(' · ');

export default function QuizPlayer({ quiz, note, onNew }: { quiz: SavedQuiz; note?: Note; onNew?: () => void }) {
  const { state, update } = useApp();
  const [list, setList] = useState<LessonStep[]>(quiz.steps);
  const [pos, setPos] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [hint, setHint] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);
  const [fixing, setFixing] = useState<'busy' | string | null>(null);

  const begin = (steps: LessonStep[]) => {
    setList(steps);
    setPos(0);
    setAnswer(null);
    setHint(false);
    setResults([]);
    setFinished(false);
    setFixing(null);
  };

  const focusBadge = quiz.focus && (
    <div className="tag" style={{ alignSelf: 'flex-start', background: 'var(--accent-soft)', color: 'var(--accent)', whiteSpace: 'normal' }}>
      <Target size={14} /> {quiz.focus}
    </div>
  );

  if (finished) {
    const correct = results.filter(Boolean).length;
    const pct = Math.round((100 * correct) / list.length);
    const failed = list.filter((_, k) => !results[k]);

    /** Mejora los apuntes (o el tema del quiz) para que expliquen bien lo que ha fallado. */
    const reinforce = async () => {
      if (!note) return;
      setFixing('busy');
      const { editNote, describeAiError } = await import('../ai/tasks');
      try {
        const one = quiz.sections?.length === 1 ? splitSections(note.markdown).find((x) => x.id === quiz.sections![0]) : undefined;
        const request =
          `${one ? `Mejora el tema ${one.n}` : 'Mejora los apuntes'} para que expliquen con claridad lo que he fallado en un quiz: añade lo que falte, aclara las confusiones ` +
          'y pon un aviso «> ⚠️ » con el error típico donde ayude. Mis fallos:\n' +
          failed.map((f) => `- ${f.text} → correcta: ${answerText(f)}${f.explanation ? ` (${f.explanation})` : ''}`).join('\n');
        const out = await editNote(state.settings, note, request, [], one ? { mode: 'section', section: one } : { mode: 'patch' });
        if (!out) return setFixing('Tus apuntes ya explican bien estos puntos: no he cambiado nada.');
        update((s) => reviseNote(s, note.id, out.markdown, `Reforzado con tus fallos: ${out.change}`));
        toast('Apuntes mejorados');
        setFixing(`✏️ ${out.change} (puedes deshacerlo en Apuntes → Versiones)`);
      } catch (e) {
        setFixing(describeAiError(e));
      }
    };

    return (
      <div className="col fadein" style={{ gap: 16 }}>
        <section className="card pad col pop" style={{ alignItems: 'center', textAlign: 'center', gap: 6 }}>
          {quiz.focus && <div className="muted small">🎯 {quiz.focus}</div>}
          <div style={{ fontSize: 46 }}>{pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '💪' : '🌱'}</div>
          <div style={{ fontSize: 40, fontWeight: 700 }}>{pct}%</div>
          <div className="muted">
            {correct} de {list.length} correctas
          </div>
        </section>
        {failed.length > 0 &&
          note?.markdown.trim() &&
          (fixing === null ? (
            <button className="btn secondary block" onClick={() => void reinforce()}>
              <NotebookPen size={17} /> Mejorar mis apuntes con estos fallos
            </button>
          ) : fixing === 'busy' ? (
            <div className="alert info row" style={{ gap: 8 }}>
              <div className="spinner" style={{ width: 16, height: 16 }} /> Mejorando tus apuntes con lo que has fallado…
            </div>
          ) : (
            <div className="alert info fadein">{fixing}</div>
          ))}
        {failed.length > 0 && (
          <section className="col" style={{ gap: 10 }}>
            <h2>Repasa tus fallos</h2>
            {failed.map((s, k) => (
              <div key={k} className="card pad col" style={{ gap: 6 }}>
                <div style={{ fontWeight: 600 }}>{s.text}</div>
                <div className="tag pill-good" style={{ alignSelf: 'flex-start' }}>
                  ✓ {answerText(s)}
                </div>
                {s.explanation && <div className="muted small">{s.explanation}</div>}
              </div>
            ))}
          </section>
        )}
        <div className="row wrap" style={{ gap: 8 }}>
          {failed.length > 0 && (
            <button className="btn secondary grow" onClick={() => begin(failed)}>
              <RotateCcw size={17} /> Repetir fallos
            </button>
          )}
          <button className="btn secondary grow" onClick={() => begin(quiz.steps)}>
            <RotateCcw size={17} /> Otra vez
          </button>
          {onNew && !quiz.fromCards && (
            <button className="btn grow" style={{ flexBasis: '100%' }} onClick={onNew}>
              <Sparkles size={17} /> {quiz.focus ? 'Preguntas nuevas de este tema' : 'Preguntas nuevas'}
            </button>
          )}
        </div>
      </div>
    );
  }

  const q = list[pos];
  const onAnswer = (ok: boolean) => {
    setAnswer(ok);
    setResults((r) => [...r, ok]);
  };
  const next = () => {
    setAnswer(null);
    setHint(false);
    if (pos + 1 < list.length) setPos(pos + 1);
    else {
      // Solo cuenta para tu nota la vuelta completa (no «Repetir fallos»).
      if (list === quiz.steps) update((s) => recordAttempt(s, quiz.id, results.filter(Boolean).length, list.length));
      setFinished(true);
    }
  };
  return (
    <div className="col" style={{ gap: 14 }}>
      {focusBadge}
      <div className="row">
        <div className="grow bar">
          <span style={{ width: `${(100 * pos) / list.length}%`, background: 'var(--accent)' }} />
        </div>
        <span className="muted small">
          {pos + 1}/{list.length}
        </span>
      </div>
      <StepView key={`${list.length}-${pos}`} step={q} done={answer !== null} onAnswer={onAnswer} />
      {answer === null &&
        q.example &&
        (hint ? (
          <div className="alert info fadein">💡 {q.example}</div>
        ) : (
          <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setHint(true)}>
            <Lightbulb size={16} /> Pista
          </button>
        ))}
      {answer !== null && (
        <div className={`feedback ${answer ? 'ok' : 'ko'} fadein`} role="status">
          <div style={{ fontWeight: 700, fontSize: 18, color: answer ? 'var(--good)' : 'var(--bad)' }}>{answer ? praise(pos) : encourage(pos)}</div>
          {q.explanation && <div style={{ lineHeight: 1.5 }}>{q.explanation}</div>}
          <button className="btn block" onClick={next}>
            {pos + 1 < list.length ? 'Continuar' : 'Ver resultado'}
          </button>
        </div>
      )}
    </div>
  );
}
