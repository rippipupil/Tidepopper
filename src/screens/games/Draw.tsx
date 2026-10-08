import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../data/store';
import { alphabetById, guessAlphabet, type Glyph } from '../../logic/alphabets';
import { normalizeMask, PASS_DRAW, similarity } from '../../logic/drawing';
import { Header, Progress } from '../../components/ui';
import { Missing } from '../StudyView';
import { Feedback, useFinish } from './common';

const SIZE = 300;
const FONT = '"Noto Sans JP", "Noto Sans KR", "Hiragino Sans", "Yu Gothic", "Malgun Gothic", system-ui, sans-serif';

function maskFromCanvas(c: HTMLCanvasElement): Uint8Array {
  const ctx = c.getContext('2d')!;
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const m = new Uint8Array(c.width * c.height);
  for (let k = 0; k < m.length; k++) m[k] = d[k * 4 + 3] > 40 ? 1 : 0;
  return m;
}

function glyphMask(char: string): Uint8Array {
  const c = document.createElement('canvas');
  c.width = c.height = 200;
  const ctx = c.getContext('2d')!;
  ctx.font = `bold 160px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText(char, 100, 105);
  return normalizeMask(maskFromCanvas(c), 200, 200);
}

function Pad({ glyph, guide, onResult }: { glyph: Glyph; guide: boolean; onResult: (score: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [inked, setInked] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    const c = ref.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = SIZE * dpr;
    c.height = SIZE * dpr;
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#1a2a3a';
  }, []);

  const pt = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * SIZE, y: ((e.clientY - r.top) / r.height) * SIZE };
  };
  const down = (e: React.PointerEvent) => {
    if (score !== null) return;
    ref.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = pt(e);
    last.current = p;
    const ctx = ref.current!.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#1a2a3a';
    ctx.fill();
    setInked(true);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    const p = pt(e);
    const ctx = ref.current!.getContext('2d')!;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const up = () => {
    drawing.current = false;
    last.current = null;
  };
  const clear = () => {
    const c = ref.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setInked(false);
  };
  const check = () => {
    const c = ref.current!;
    const s = similarity(normalizeMask(maskFromCanvas(c), c.width, c.height), glyphMask(glyph.char));
    setScore(s);
  };

  return (
    <>
      <div className="px" style={{ position: 'relative', width: '100%', maxWidth: SIZE + 8, aspectRatio: '1', alignSelf: 'center', padding: 4 }}>
        {(guide || score !== null) && (
          <div aria-hidden="true" style={{ position: 'absolute', inset: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 'min(56vw, 230px)', color: score !== null ? 'rgba(95,143,179,0.45)' : 'rgba(26,42,58,0.12)', pointerEvents: 'none' }}>
            {glyph.char}
          </div>
        )}
        <canvas
          ref={ref}
          aria-label={`Zona para dibujar la letra que se lee «${glyph.sound}»`}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          style={{ position: 'relative', width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair', backgroundImage: 'linear-gradient(rgba(26,42,58,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(26,42,58,.08) 1px, transparent 1px)', backgroundSize: '50% 50%' }}
        />
      </div>
      {score === null ? (
        <div className="row">
          <button className="btn ghost" onClick={clear} disabled={!inked}>
            Borrar
          </button>
          <button className="btn grow" onClick={check} disabled={!inked}>
            Comprobar
          </button>
        </div>
      ) : (
        <>
          <Feedback ok={score >= PASS_DRAW} text={`${score >= PASS_DRAW ? '¡BIEN DIBUJADA!' : 'SE PARECE POCO'} · ${score}%${guide ? ' (CON GUÍA)' : ''}`} />
          <button className="btn block" onClick={() => onResult(score)}>
            Seguir
          </button>
        </>
      )}
    </>
  );
}

export default function Draw({ id }: { id: string }) {
  const { state } = useApp();
  const study = state.studies.find((s) => s.id === id);
  const alpha = study ? (alphabetById(study.alphabet) ?? guessAlphabet(`${study.name} ${study.course?.topic ?? ''}`)) : undefined;
  const [glyphs] = useState(() => (alpha ? alpha.glyphs.slice().sort(() => Math.random() - 0.5).slice(0, 8) : []));
  const [pos, setPos] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [guide, setGuide] = useState(false);
  const finish = useFinish(id);
  if (!study || !alpha || !glyphs.length) return <Missing />;
  const g = glyphs[pos];

  return (
    <main className="screen" style={{ paddingBottom: 32 }}>
      <Header back={`#/estudio/${id}/juegos`} title={`Dibuja · ${alpha.name}`}>
        <span className="vt" style={{ fontSize: 20, color: 'var(--glow)' }}>
          {pos + 1}/{glyphs.length}
        </span>
      </Header>
      <Progress value={(100 * pos) / glyphs.length} color="var(--blue-hi)" track="var(--lcd-hi)" height={8} />
      <section className="lcd row" style={{ padding: '14px 16px' }}>
        <div className="grow">
          <div style={{ fontSize: 18, color: 'var(--dim)' }}>DIBUJA LA LETRA QUE SE LEE</div>
          <div style={{ fontSize: 40, lineHeight: 1, color: 'var(--text)' }}>«{g.sound}»</div>
        </div>
        <label className="row" style={{ fontSize: 18, gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={guide} onChange={(e) => setGuide(e.target.checked)} style={{ width: 22, height: 22 }} />
          GUÍA
        </label>
      </section>
      <Pad
        key={pos}
        glyph={g}
        guide={guide}
        onResult={(score) => {
          const n = correct + (score >= PASS_DRAW ? 1 : 0);
          if (pos + 1 < glyphs.length) {
            setCorrect(n);
            setPos(pos + 1);
          } else finish(n, glyphs.length, 'letters');
        }}
      />
    </main>
  );
}
