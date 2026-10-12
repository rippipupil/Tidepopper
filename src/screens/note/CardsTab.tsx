import { useMemo, useState } from 'react';
import { Pencil, Plus, RotateCcw, Shuffle, Sparkles, Star, Trash2 } from 'lucide-react';
import { useApp } from '../../data/store';
import { addCards, deleteCard, noteCards, resetCards, updateCard } from '../../data/actions';
import { uid } from '../../data/db';
import { cardStatus, memoryOf, statusCounts, studyQueue } from '../../logic/learn';
import { shuffled } from '../../logic/lesson';
import type { Card, Note } from '../../data/types';
import FlashSession from '../../components/FlashSession';
import { Bar, Sheet, toast } from '../../components/ui';

const STATUS_LABEL = { new: 'Nueva', learning: 'Aprendiendo', mastered: 'Dominada' } as const;
const STATUS_CLASS = { new: 'pill-accent', learning: 'pill-warn', mastered: 'pill-good' } as const;

export default function CardsTab({ note }: { note: Note }) {
  const { state, update } = useApp();
  const cards = noteCards(state, note.id);
  const [session, setSession] = useState<Card[] | null>(null);
  const [result, setResult] = useState<{ known: number; total: number } | null>(null);
  const [shuffle, setShuffle] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [onlyFav, setOnlyFav] = useState(false);
  const [edit, setEdit] = useState<Card | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const counts = statusCounts(cards);
  const now = Date.now();
  const list = useMemo(() => cards.filter((c) => !onlyFav || c.favorite), [cards, onlyFav]);

  const start = (all: boolean) => {
    let q = all ? list : studyQueue(list, now, 20);
    if (!q.length) q = list.slice(0, 20);
    if (shuffle) q = shuffled(q);
    setResult(null);
    setSession(q);
  };

  const more = async () => {
    setBusy(true);
    try {
      const { generateMoreCards } = await import('../../ai/tasks');
      const extra = await generateMoreCards(state.settings, note, cards.map((c) => c.front));
      update((s) => addCards(s, note.id, extra, Date.now(), uid));
      toast(`+${extra.length} tarjetas nuevas`);
    } catch (e) {
      const { describeAiError } = await import('../../ai/tasks');
      toast(describeAiError(e));
    } finally {
      setBusy(false);
    }
  };

  if (session)
    return (
      <div className="col">
        <FlashSession
          key={session.map((c) => c.id).join()}
          cards={session}
          reverse={reverse}
          onDone={(r) => {
            setSession(null);
            setResult(r);
          }}
        />
        <button className="btn ghost sm" style={{ alignSelf: 'center' }} onClick={() => setSession(null)}>
          Terminar
        </button>
      </div>
    );

  return (
    <div className="col fadein" style={{ gap: 16 }}>
      {result && (
        <div className="card pad col pop" style={{ alignItems: 'center', textAlign: 'center', gap: 6 }}>
          <div style={{ fontSize: 40 }}>{result.known === result.total ? '🎉' : result.known / result.total >= 0.6 ? '💪' : '🌱'}</div>
          <h2>
            Sabías {result.known} de {result.total}
          </h2>
          <p className="muted small">Las que fallaste volverán antes; las que sabías, más tarde.</p>
        </div>
      )}

      <section className="card pad col" style={{ gap: 14 }}>
        <div className="row">
          <div className="grow">
            <div className="muted small">Dominio</div>
            <div style={{ fontSize: 30, fontWeight: 700 }}>{memoryOf(cards)}%</div>
          </div>
          <div className="col" style={{ gap: 2, alignItems: 'flex-end' }}>
            <span className="tag pill-accent">{counts.new} nuevas</span>
            <span className="tag pill-warn">{counts.learning} aprendiendo</span>
            <span className="tag pill-good">{counts.mastered} dominadas</span>
          </div>
        </div>
        <Bar parts={[{ value: counts.mastered, color: 'var(--good)' }, { value: counts.learning, color: 'var(--warn)' }, { value: counts.new, color: 'var(--surface-3)' }]} />
        <div className="row wrap" style={{ gap: 8 }}>
          <button className="chip" aria-pressed={shuffle} onClick={() => setShuffle((x) => !x)}>
            <Shuffle size={14} /> Mezclar
          </button>
          <button className="chip" aria-pressed={reverse} onClick={() => setReverse((x) => !x)}>
            <RotateCcw size={14} /> Al revés
          </button>
          <button className="chip" aria-pressed={onlyFav} onClick={() => setOnlyFav((x) => !x)}>
            <Star size={14} /> Favoritas
          </button>
        </div>
        <div className="row">
          <button className="btn grow" disabled={!list.length} onClick={() => start(false)}>
            Estudiar
          </button>
          <button className="btn secondary" disabled={!list.length} onClick={() => start(true)}>
            Todas
          </button>
        </div>
      </section>

      <div className="row">
        <h2 className="grow">{list.length} tarjetas</h2>
        <button className="iconbtn filled" aria-label="Añadir tarjeta" onClick={() => setEdit('new')}>
          <Plus size={20} />
        </button>
      </div>

      <button className="btn secondary" onClick={() => void more()} disabled={busy}>
        {busy ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Sparkles size={17} />} {busy ? 'Creando tarjetas…' : 'Más tarjetas con IA'}
      </button>

      <div className="col" style={{ gap: 10 }}>
        {list.map((c) => {
          const st = cardStatus(c);
          return (
            <div key={c.id} className="card pad col" style={{ gap: 8, padding: 16 }}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <div className="grow" style={{ fontWeight: 650 }}>{c.front}</div>
                <button className="iconbtn" style={{ width: 34, height: 34 }} aria-label="Favorita" onClick={() => update((s) => updateCard(s, c.id, { favorite: !c.favorite }))}>
                  <Star size={17} fill={c.favorite ? 'var(--warn)' : 'none'} color={c.favorite ? 'var(--warn)' : 'currentColor'} />
                </button>
                <button className="iconbtn" style={{ width: 34, height: 34 }} aria-label="Editar" onClick={() => setEdit(c)}>
                  <Pencil size={16} />
                </button>
              </div>
              <div className="muted" style={{ fontSize: 15 }}>{c.back}</div>
              <span className={`tag ${STATUS_CLASS[st]}`} style={{ alignSelf: 'flex-start' }}>
                {STATUS_LABEL[st]}
              </span>
            </div>
          );
        })}
      </div>
      {cards.length > 0 && (
        <button
          className="btn ghost sm"
          style={{ alignSelf: 'center' }}
          onClick={() => confirm('¿Empezar de cero con estas tarjetas? Volverán a ser nuevas.') && update((s) => resetCards(s, note.id, Date.now()))}
        >
          Reiniciar progreso
        </button>
      )}

      {edit && <CardEditor note={note} card={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function CardEditor({ note, card, onClose }: { note: Note; card: Card | null; onClose: () => void }) {
  const { update } = useApp();
  const [front, setFront] = useState(card?.front ?? '');
  const [back, setBack] = useState(card?.back ?? '');
  return (
    <Sheet title={card ? 'Editar tarjeta' : 'Nueva tarjeta'} onClose={onClose}>
      <label className="col" style={{ gap: 6 }}>
        <span className="label">Delante (término o pregunta)</span>
        <textarea className="field" style={{ minHeight: 70 }} autoFocus value={front} onChange={(e) => setFront(e.target.value)} />
      </label>
      <label className="col" style={{ gap: 6 }}>
        <span className="label">Detrás (respuesta)</span>
        <textarea className="field" style={{ minHeight: 90 }} value={back} onChange={(e) => setBack(e.target.value)} />
      </label>
      <div className="row">
        {card && (
          <button
            className="btn ghost"
            aria-label="Borrar"
            onClick={() => {
              update((s) => deleteCard(s, card.id));
              onClose();
            }}
          >
            <Trash2 size={18} />
          </button>
        )}
        <button
          className="btn grow"
          disabled={!front.trim() || !back.trim()}
          onClick={() => {
            if (card) update((s) => updateCard(s, card.id, { front: front.trim(), back: back.trim() }));
            else update((s) => addCards(s, note.id, [{ front, back }], Date.now(), uid));
            onClose();
          }}
        >
          Guardar
        </button>
      </div>
    </Sheet>
  );
}
