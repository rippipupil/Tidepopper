import { useState } from 'react';
import { useApp } from '../data/store';
import { dueCards, memoryOf, statusCounts, studyQueue } from '../logic/learn';
import type { Card } from '../data/types';
import FlashSession from '../components/FlashSession';
import { Bar, BottomNav, TopBar } from '../components/ui';

/** Repaso diario: las tarjetas vencidas de todas tus notas, justo antes de olvidarlas. */
export default function Review() {
  const { state } = useApp();
  const now = Date.now();
  const due = dueCards(state.cards, now);
  const [session, setSession] = useState<Card[] | null>(null);
  const [result, setResult] = useState<{ known: number; total: number } | null>(null);
  const counts = statusCounts(state.cards);
  const fresh = studyQueue(state.cards, now, 20).filter((c) => !due.includes(c));

  const perNote = state.notes
    .map((n) => {
      const cards = state.cards.filter((c) => c.noteId === n.id);
      return { note: n, cards, due: due.filter((c) => c.noteId === n.id).length, mem: memoryOf(cards) };
    })
    .filter((x) => x.cards.length)
    .sort((a, b) => b.due - a.due || a.mem - b.mem);

  return (
    <div className="app">
      <TopBar title="Repasar" />
      <main className="page">
        {session ? (
          <>
            <FlashSession
              key={session.map((c) => c.id).join()}
              cards={session}
              onDone={(r) => {
                setSession(null);
                setResult(r);
              }}
            />
            <button className="btn ghost sm" style={{ alignSelf: 'center' }} onClick={() => setSession(null)}>
              Terminar
            </button>
          </>
        ) : (
          <>
            {result && (
              <div className="card pad col pop" style={{ alignItems: 'center', textAlign: 'center', gap: 4 }}>
                <div style={{ fontSize: 40 }}>{result.known === result.total ? '🎉' : '💪'}</div>
                <h2>
                  Sabías {result.known} de {result.total}
                </h2>
              </div>
            )}
            <section className="hero col" style={{ gap: 12 }}>
              <div style={{ fontSize: 36 }}>{due.length ? '🔁' : '✅'}</div>
              <h1>{due.length ? `${due.length} tarjeta${due.length === 1 ? '' : 's'} para hoy` : '¡Todo al día!'}</h1>
              <p className="muted">
                {due.length ? 'Repasar justo cuando estás a punto de olvidar es lo que más rinde.' : fresh.length ? 'Puedes adelantar con tarjetas nuevas.' : 'Crea notas para tener tarjetas que repasar.'}
              </p>
              {due.length > 0 && (
                <button className="btn" onClick={() => (setResult(null), setSession(due.slice(0, 30)))}>
                  Empezar repaso
                </button>
              )}
              {!due.length && fresh.length > 0 && (
                <button className="btn" onClick={() => (setResult(null), setSession(fresh))}>
                  Aprender {fresh.length} nuevas
                </button>
              )}
            </section>

            {state.cards.length > 0 && (
              <section className="card pad col" style={{ gap: 10 }}>
                <div className="row">
                  <h3 className="grow">Tu memoria</h3>
                  <b>{memoryOf(state.cards)}%</b>
                </div>
                <Bar parts={[{ value: counts.mastered, color: 'var(--good)' }, { value: counts.learning, color: 'var(--warn)' }, { value: counts.new, color: 'var(--surface-3)' }]} />
                <div className="row small muted wrap" style={{ gap: 14 }}>
                  <span>🟢 {counts.mastered} dominadas</span>
                  <span>🟡 {counts.learning} aprendiendo</span>
                  <span>⚪ {counts.new} nuevas</span>
                </div>
              </section>
            )}

            {perNote.length > 0 && (
              <section className="col" style={{ gap: 10 }}>
                <h2>Por nota</h2>
                {perNote.map(({ note, cards, due: d, mem }) => (
                  <a key={note.id} href={`#/nota/${note.id}?tab=tarjetas`} className="card click pad row">
                    <span className="note-emoji" style={{ width: 40, height: 40, fontSize: 22 }}>{note.emoji}</span>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="ellipsis" style={{ display: 'block', fontWeight: 600 }}>{note.title}</span>
                      <span className="muted small">
                        {cards.length} tarjetas · {mem}% dominado
                      </span>
                    </span>
                    {d > 0 && <span className="badge">{d}</span>}
                  </a>
                ))}
              </section>
            )}
          </>
        )}
      </main>
      <BottomNav active="repasar" due={due.length} />
    </div>
  );
}
