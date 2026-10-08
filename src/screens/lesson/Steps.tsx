import { useMemo, useState } from 'react';
import type { LessonStep } from '../../data/types';
import { checkChoice, checkOrder, checkWrite, pairsPassed, scrambledOrder, shuffled } from '../../logic/lesson';
import { optionStyle } from '../games/common';

// Un componente por tipo de paso. Cada ejercicio llama a onAnswer(acierto) una sola vez;
// «done» indica que ya se ha respondido y hay que enseñar la solución.

interface Props {
  step: LessonStep;
  done: boolean;
  onAnswer: (ok: boolean) => void;
}

const card: React.CSSProperties = { padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 12 };
const prompt: React.CSSProperties = { fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 20, lineHeight: 1.3 };

function Emoji({ e, size = 44 }: { e: string; size?: number }) {
  return e ? (
    <div aria-hidden className="pop" style={{ fontSize: size, lineHeight: 1 }}>
      {e}
    </div>
  ) : null;
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
    <article className="px" style={card}>
      <Emoji e={step.emoji} size={52} />
      <p style={{ margin: 0, fontSize: 19, lineHeight: 1.5, fontWeight: 600 }}>{step.text}</p>
      {step.example && (
        <div style={{ background: 'rgba(95,143,179,.16)', padding: '10px 12px', fontSize: 15, lineHeight: 1.45 }}>
          <b>💡 Ejemplo:</b> {step.example}
        </div>
      )}
    </article>
  );
}

const optionBg = (done: boolean, k: number, answer: number, picked: number | null) =>
  !done ? 'var(--paper)' : k === answer ? 'var(--mint)' : k === picked ? 'var(--coral)' : '#7f93a5';

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
      <section className="lcd" style={{ ...card, color: 'var(--text)' }}>
        <Emoji e={step.emoji} size={34} />
        <div style={prompt}>
          {step.type === 'hueco'
            ? step.text.split(/_{2,}/).map((part, k, all) => (
                <span key={k}>
                  {part}
                  {k < all.length - 1 && (
                    <span style={{ display: 'inline-block', minWidth: 70, borderBottom: '3px solid var(--glow)', color: done ? 'var(--mint)' : 'var(--glow)', textAlign: 'center' }}>{filled || ' '}</span>
                  )}
                </span>
              ))
            : step.text}
        </div>
      </section>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {step.options.map((o, k) => (
          <button key={k} className={`px${done && k === picked && k !== step.answer ? ' shake' : ''}`} onClick={() => pick(k)} style={optionStyle(optionBg(done, k, step.answer, picked))}>
            {o}
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
      <section className="lcd" style={{ ...card, color: 'var(--text)' }}>
        <div style={{ fontSize: 18, color: 'var(--dim)' }}>¿VERDADERO O FALSO?</div>
        <Emoji e={step.emoji} size={34} />
        <div style={prompt}>{step.text}</div>
      </section>
      <div className="row" style={{ gap: 14 }}>
        {[
          { k: 1, label: '✓ Verdadero' },
          { k: 0, label: '✗ Falso' },
        ].map((o) => (
          <button key={o.k} className={`px grow${done && o.k === picked && o.k !== step.answer ? ' shake' : ''}`} onClick={() => pick(o.k)} style={{ ...optionStyle(optionBg(done, o.k, step.answer, picked)), textAlign: 'center', padding: '22px 8px', fontSize: 17 }}>
            {o.label}
          </button>
        ))}
      </div>
    </>
  );
}

const chip: React.CSSProperties = { border: 0, cursor: 'pointer', padding: '10px 12px', fontSize: 15, fontWeight: 600 };

/** «ordena»: tocar los elementos en el orden correcto; tocar uno ya puesto lo devuelve. */
function Order({ step, done, onAnswer }: Props) {
  const pool = useMemo(() => scrambledOrder(step.options), [step]);
  const [chosen, setChosen] = useState<string[]>([]);
  const left = pool.filter((x) => !chosen.includes(x));
  const ok = done && checkOrder(step, chosen);
  return (
    <>
      <section className="lcd" style={{ ...card, color: 'var(--text)' }}>
        <div style={{ fontSize: 18, color: 'var(--dim)' }}>ORDENA</div>
        <Emoji e={step.emoji} size={34} />
        <div style={prompt}>{step.text}</div>
      </section>
      <div className="px" style={{ padding: 12, minHeight: 64, display: 'flex', flexDirection: 'column', gap: 8, background: done ? (ok ? 'var(--mint)' : 'var(--coral)') : 'var(--paper)' }}>
        {chosen.length === 0 && <span style={{ opacity: 0.6, fontSize: 14 }}>Toca abajo en orden…</span>}
        {chosen.map((x, k) => (
          <button key={x} className="lcd" disabled={done} onClick={() => setChosen(chosen.filter((y) => y !== x))} style={{ ...chip, textAlign: 'left', color: 'var(--text)' }}>
            {k + 1}. {x}
          </button>
        ))}
      </div>
      {done && !ok && (
        <div className="lcd toast" style={{ fontSize: 14, color: 'var(--text)', fontFamily: 'var(--f-body)' }}>
          Orden correcto: {step.options.map((x, k) => `${k + 1}. ${x}`).join(' · ')}
        </div>
      )}
      {!done && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {left.map((x) => (
            <button key={x} className="px" onClick={() => setChosen([...chosen, x])} style={chip}>
              {x}
            </button>
          ))}
        </div>
      )}
      {!done && left.length === 0 && (
        <button className="btn gold block" onClick={() => onAnswer(checkOrder(step, chosen))}>
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
  const tile = (bg: string): React.CSSProperties => ({ ...chip, minHeight: 56, fontSize: 14, lineHeight: 1.25, background: bg });
  return (
    <>
      <section className="lcd" style={{ ...card, color: 'var(--text)' }}>
        <div style={{ fontSize: 18, color: 'var(--dim)' }}>UNE LAS PAREJAS {misses > 0 && `· ${misses} FALLO${misses > 1 ? 'S' : ''}`}</div>
        <div style={prompt}>{step.text}</div>
      </section>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lefts.map((a) => (
            <button key={a} className="px" aria-pressed={sel === a} onClick={() => !matched.includes(a) && setSel(a)} style={tile(matched.includes(a) ? 'var(--mint)' : sel === a ? 'var(--blue-hi)' : 'var(--paper)')}>
              {a}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rights.map((b) => (
            <button key={b} className={`px${wrong === b ? ' shake' : ''}`} onClick={() => tapRight(b)} style={tile(doneB(b) ? 'var(--mint)' : wrong === b ? 'var(--coral)' : '#c9d6e1')}>
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
      <section className="lcd" style={{ ...card, color: 'var(--text)' }}>
        <div style={{ fontSize: 18, color: 'var(--dim)' }}>ESCRIBE LA RESPUESTA</div>
        <Emoji e={step.emoji} size={34} />
        <div style={prompt}>{step.text}</div>
      </section>
      <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
          style={{ fontSize: 18, background: ok === null ? undefined : ok ? 'var(--mint)' : 'var(--coral)', color: ok === null ? undefined : 'var(--outline)' }}
        />
        {done && ok === false && (
          <div className="lcd toast" style={{ fontSize: 15, color: 'var(--text)', fontFamily: 'var(--f-body)' }}>
            Respuesta: <b>{step.accepted[0]}</b>
          </div>
        )}
        {!done && (
          <button type="submit" className="btn gold block" disabled={!text.trim()}>
            Comprobar
          </button>
        )}
      </form>
    </>
  );
}
