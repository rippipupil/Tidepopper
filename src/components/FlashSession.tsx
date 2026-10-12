import { useEffect, useState } from 'react';
import { RotateCcw, Star } from 'lucide-react';
import { useApp } from '../data/store';
import { gradeCard, updateCard } from '../data/actions';
import type { Card, Grade } from '../data/types';

const GRADES: { g: Grade; label: string; cls: string; key: string }[] = [
  { g: 'again', label: 'No la sabía', cls: 'danger', key: '1' },
  { g: 'hard', label: 'Casi', cls: 'secondary', key: '2' },
  { g: 'good', label: 'La sabía', cls: 'good', key: '3' },
];

/** Sesión de tarjetas: tocar para girar y decir cómo de bien la sabías (repetición espaciada). */
export default function FlashSession({ cards, reverse = false, onDone }: { cards: Card[]; reverse?: boolean; onDone: (r: { known: number; total: number }) => void }) {
  const { state, update } = useApp();
  const [queue] = useState(cards);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const card = queue[pos];
  const live = state.cards.find((c) => c.id === card?.id) ?? card;

  const grade = (g: Grade) => {
    if (!flipped || !card) return;
    update((s) => gradeCard(s, card.id, g, Date.now()));
    const k = known + (g === 'again' ? 0 : 1);
    setKnown(k);
    if (pos + 1 >= queue.length) onDone({ known: k, total: queue.length });
    else {
      setPos(pos + 1);
      setFlipped(false);
    }
  };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      }
      const gr = GRADES.find((x) => x.key === e.key);
      if (gr) grade(gr.g);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  if (!card) return null;
  const front = reverse ? live.back : live.front;
  const back = reverse ? live.front : live.back;

  return (
    <div className="col fadein" style={{ gap: 16 }}>
      <div className="row">
        <div className="grow bar">
          <span style={{ width: `${(100 * pos) / queue.length}%`, background: 'var(--accent)' }} />
        </div>
        <span className="muted small">
          {pos + 1}/{queue.length}
        </span>
        <button className="iconbtn" aria-label={live.favorite ? 'Quitar de favoritas' : 'Marcar como favorita'} onClick={() => update((s) => updateCard(s, card.id, { favorite: !live.favorite }))}>
          <Star size={20} fill={live.favorite ? 'var(--warn)' : 'none'} color={live.favorite ? 'var(--warn)' : 'currentColor'} />
        </button>
      </div>
      <div className={`flip${flipped ? ' on' : ''}`} onClick={() => setFlipped((f) => !f)} role="button" aria-label={flipped ? 'Ver la pregunta' : 'Ver la respuesta'} tabIndex={0}>
        <div className="flip-in">
          <div className="flip-face">
            {front}
            <span className="flip-hint">Toca para girar</span>
          </div>
          <div className="flip-face back">
            {back}
            <span className="flip-hint">
              <RotateCcw size={12} /> {reverse ? 'Término' : 'Respuesta'}
            </span>
          </div>
        </div>
      </div>
      {flipped ? (
        <div className="row fadein" style={{ gap: 8 }}>
          {GRADES.map((x) => (
            <button key={x.g} className={`btn ${x.cls} grow`} style={{ padding: '12px 6px', fontSize: 14 }} onClick={() => grade(x.g)}>
              {x.label}
            </button>
          ))}
        </div>
      ) : (
        <button className="btn secondary block" onClick={() => setFlipped(true)}>
          Mostrar respuesta
        </button>
      )}
    </div>
  );
}
