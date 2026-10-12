import { useMemo, useState } from 'react';
import type { LessonStep } from '../data/types';
import { checkChoice, checkOrder, checkWrite, pairsPassed, scrambledOrder, shuffled } from '../logic/lesson';

// Un componente por tipo de paso (lecciones y quiz). Cada ejercicio llama a onAnswer(acierto)
// una sola vez; «done» indica que ya se ha respondido y hay que enseñar la solución.

interface Props {
  step: LessonStep;
  done: boolean;
  onAnswer: (ok: boolean) => void;
}

const prompt: React.CSSProperties = { fontWeight: 650, fontSize: 20, lineHeight: 1.35 };
const LETTERS = 'ABCDEFGH';

function Emoji({ e, size = 40 }: { e: string; size?: number }) {
  return e ? (
    <div aria-hidden className="pop" style={{ fontSize: size, lineHeight: 1 }}>
      {e}
    </div>
  ) : null;
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="tag pill-accent" style={{ alignSelf: 'flex-start' }}>{children}</div>;
}

export function StepView(p: Props) {
  switch (p.step.type) {
    case 'explica':
      return <Explain {...p} />;
    case 'elige':
    case 'hueco':
      return <Choice {...p} />;
    case 'vf':
      return <TrueFalse {...p} />;
    case 'ordena':
      return <Order {...p} />;
    case 'parejas':
      return <Pairs {...p} />;
    case 'escribe':
      return <Write {...p} />;
  }
}

function Explain({ step }: Props) {
  return (
    <article className="card step-card">
      <Emoji e={step.emoji} size={52} />
      <p style={{ fontSize: 19, lineHeight: 1.55, fontWeight: 550 }}>{step.text}</p>
      {step.example && (
        <div className="soft" style={{ fontSize: 15, lineHeight: 1.5 }}>
          <b>💡 Ejemplo:</b> {step.example}
        </div>
      )}
    </article>
  );
}

const optionClass = (done: boolean, k: number, answer: number, picked: number | null) =>
  !done ? 'option' : k === answer ? 'option right' : k === picked ? 'option wrong shake' : 'option dim';

/** «elige» y «hueco»: tocar la opción correcta. En «hueco» la palabra elegida rellena la frase. */
function Choice({ step, done, onAnswer }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const pick = (k: number) => {
    if (done) return;
    setPicked(k);
    onAnswer(checkChoice(step, k));
  };
  const filled = done ? step.options[step.answer] : picked !== null ? step.options[picked] : '';
  return (
    <>
      <section className="card step-card">
        <Label>{step.type === 'hueco' ? 'Completa la frase' : 'Elige la respuesta'}</Label>
        <Emoji e={step.emoji} />
        <div style={prompt}>
          {step.type === 'hueco'
            ? step.text.split(/_{2,}/).map((part, k, all) => (
                <span key={k}>
                  {part}
                  {k < all.length - 1 && (
                    <span style={{ display: 'inline-block', minWidth: 80, borderBottom: '3px solid var(--accent)', color: done ? 'var(--good)' : 'var(--accent)', textAlign: 'center' }}>{filled || ' '}</span>
                  )}
                </span>
              ))
            : step.text}
        </div>
      </section>
      <div className="col" style={{ gap: 10 }}>
        {step.options.map((o, k) => (
          <button key={k} className={optionClass(done, k, step.answer, picked)} disabled={done} onClick={() => pick(k)}>
            <span className="key">{LETTERS[k]}</span>
            <span className="grow">{o}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function TrueFalse({ step, done, onAnswer }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const pick = (k: number) => {
    if (done) return;
    setPicked(k);
    onAnswer(checkChoice(step, k));
  };
  return (
    <>
      <section className="card step-card">
        <Label>¿Verdadero o falso?</Label>
        <Emoji e={step.emoji} />
        <div style={prompt}>{step.text}</div>
      </section>
      <div className="row" style={{ gap: 12 }}>
        {[
          { k: 1, label: '✓ Verdadero' },
          { k: 0, label: '✗ Falso' },
        ].map((o) => (
          <button key={o.k} className={`${optionClass(done, o.k, step.answer, picked)} grow`} disabled={done} onClick={() => pick(o.k)} style={{ justifyContent: 'center', padding: '20px 8px', fontWeight: 650 }}>
            {o.label}
          </button>
        ))}
      </div>
    </>
  );
}

/** «ordena»: tocar los elementos en el orden correcto; tocar uno ya puesto lo devuelve. */
function Order({ step, done, onAnswer }: Props) {
  const pool = useMemo(() => scrambledOrder(step.options), [step]);
  const [chosen, setChosen] = useState<string[]>([]);
  const left = pool.filter((x) => !chosen.includes(x));
  const ok = done && checkOrder(step, chosen);
  return (
    <>
      <section className="card step-card">
        <Label>Ordena</Label>
        <Emoji e={step.emoji} />
        <div style={prompt}>{step.text}</div>
      </section>
      <div className="card pad col" style={{ gap: 8, minHeight: 70, borderColor: done ? (ok ? 'var(--good)' : 'var(--bad)') : undefined }}>
        {chosen.length === 0 && <span className="faint small">Toca abajo en orden…</span>}
        {chosen.map((x, k) => (
          <button key={x} className="option" disabled={done} onClick={() => setChosen(chosen.filter((y) => y !== x))} style={{ padding: '10px 12px' }}>
            <span className="key">{k + 1}</span>
            {x}
          </button>
        ))}
      </div>
      {done && !ok && (
        <div className="alert bad">
          Orden correcto: {step.options.map((x, k) => `${k + 1}. ${x}`).join(' · ')}
        </div>
      )}
      {!done && (
        <div className="chips-pick">
          {left.map((x) => (
            <button key={x} onClick={() => setChosen([...chosen, x])}>
              {x}
            </button>
          ))}
        </div>
      )}
      {!done && left.length === 0 && (
        <button className="btn block" onClick={() => onAnswer(checkOrder(step, chosen))}>
          Comprobar
        </button>
      )}
    </>
  );
}

/** «parejas»: tocar uno de la izquierda y su pareja de la derecha. */
function Pairs({ step, done, onAnswer }: Props) {
  const lefts = useMemo(() => shuffled(step.pairs.map((p) => p.a)), [step]);
  const rights = useMemo(() => shuffled(step.pairs.map((p) => p.b)), [step]);
  const [sel, setSel] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const tapRight = (b: string) => {
    if (done || !sel || matched.includes(sel)) return;
    const pair = step.pairs.find((p) => p.a === sel)!;
    if (pair.b === b) {
      const m = [...matched, sel];
      setMatched(m);
      setSel(null);
      if (m.length === step.pairs.length) onAnswer(pairsPassed(misses));
    } else {
      setMisses(misses + 1);
      setWrong(b);
      window.setTimeout(() => setWrong(null), 600);
    }
  };
  const doneB = (b: string) => matched.some((a) => step.pairs.find((p) => p.a === a)!.b === b);
  const cls = (state: 'idle' | 'sel' | 'ok' | 'ko') => `option${state === 'ok' ? ' right' : state === 'ko' ? ' wrong shake' : ''}`;
  return (
    <>
      <section className="card step-card">
        <Label>Une las parejas{misses > 0 && ` · ${misses} fallo${misses > 1 ? 's' : ''}`}</Label>
        <div style={prompt}>{step.text}</div>
      </section>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="col" style={{ gap: 10 }}>
          {lefts.map((a) => (
            <button
              key={a}
              className={cls(matched.includes(a) ? 'ok' : sel === a ? 'sel' : 'idle')}
              aria-pressed={sel === a}
              style={{ fontSize: 14, padding: '12px', minHeight: 56, ...(sel === a ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : {}) }}
              onClick={() => !matched.includes(a) && setSel(a)}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="col" style={{ gap: 10 }}>
          {rights.map((b) => (
            <button key={b} className={cls(doneB(b) ? 'ok' : wrong === b ? 'ko' : 'idle')} style={{ fontSize: 14, padding: '12px', minHeight: 56 }} onClick={() => tapRight(b)}>
              {b}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/** «escribe»: escribir la respuesta; se perdonan tildes y una errata. */
function Write({ step, done, onAnswer }: Props) {
  const [text, setText] = useState('');
  const [ok, setOk] = useState<boolean | null>(null);
  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (done || !text.trim()) return;
    const r = checkWrite(step, text);
    setOk(r);
    onAnswer(r);
  };
  return (
    <>
      <section className="card step-card">
        <Label>Escribe la respuesta</Label>
        <Emoji e={step.emoji} />
        <div style={prompt}>{step.text}</div>
      </section>
      <form onSubmit={send} className="col" style={{ gap: 12 }}>
        <label className="sr" htmlFor="lesson-write">
          Tu respuesta
        </label>
        <input
          id="lesson-write"
          className={`field${ok === false ? ' shake' : ''}`}
          autoComplete="off"
          autoCapitalize="off"
          value={text}
          disabled={done}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tu respuesta…"
          style={{ fontSize: 18, ...(ok === null ? {} : { borderColor: ok ? 'var(--good)' : 'var(--bad)', background: ok ? 'var(--good-soft)' : 'var(--bad-soft)' }) }}
        />
        {done && ok === false && (
          <div className="alert bad">
            Respuesta: <b>{step.accepted[0]}</b>
          </div>
        )}
        {!done && (
          <button type="submit" className="btn block" disabled={!text.trim()}>
            Comprobar
          </button>
        )}
      </form>
    </>
  );
}
