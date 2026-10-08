import { useState } from 'react';
import { useApp } from '../data/store';
import { beginAttack, endAttack } from '../data/actions';
import { attacksLeft, dayKey } from '../logic/rewards';
import { buildQuiz, type QuizItem } from '../logic/quiz';
import { hitPower } from '../logic/economy';
import type { Placed } from '../data/types';
import { Header } from '../components/ui';
import IsoMap from '../components/IsoMap';

const FORTRESS: Placed[] = (() => {
  const b: Placed[] = [
    { id: 'e1', type: 'ayuntamiento', i: 6, j: 6, level: 3 },
    { id: 'e2', type: 'mina', i: 2, j: 2, level: 2 },
    { id: 'e3', type: 'arqueras', i: 11, j: 3, level: 2 },
    { id: 'e4', type: 'canon', i: 2, j: 9, level: 2 },
    { id: 'e5', type: 'almacen', i: 12, j: 9, level: 2 },
    { id: 'e6', type: 'catapulta', i: 9, j: 12, level: 2 },
  ];
  for (let i = 5; i <= 10; i++) for (let j = 5; j <= 10; j++) if (i === 5 || i === 10 || j === 5 || j === 10) b.push({ id: `w${i}-${j}`, type: 'muro', i, j, level: 1 });
  return b;
})();
const SPOTS = [
  [60, 150], [330, 150], [90, 190], [300, 190], [140, 210], [250, 210], [40, 120], [350, 120],
];

export default function Attack() {
  const { state, update } = useApp();
  const now = Date.now();
  const left = attacksLeft(state.village, dayKey(now));
  const learned = state.cards.filter((c) => c.sched.reps > 0);
  const [quiz, setQuiz] = useState<QuizItem[] | null>(null);
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [hits, setHits] = useState(0);
  const [done, setDone] = useState<{ loot: number; pct: number } | null>(null);

  const start = () => {
    const pool = learned.length >= 4 ? learned : state.cards;
    const q = buildQuiz(pool, Math.min(8, state.village.troops));
    const next = beginAttack(state, now);
    if (!next || q.length === 0) return;
    update(() => next);
    setQuiz(q);
  };

  const power = quiz ? hitPower(quiz.length, state.village.labLevel) : 0;
  const pct = quiz ? Math.min(100, Math.round(hits * power)) : 0;
  const finish = (finalHits: number) => {
    const p = Math.min(100, Math.round(finalHits * hitPower(quiz!.length, state.village.labLevel)));
    const { loot } = endAttack(state, p, quiz!.length);
    update((s) => endAttack(s, p, quiz!.length).state);
    setDone({ loot, pct: p });
  };

  const order = [...FORTRESS].sort((a, b) => a.i + a.j - (b.i + b.j));
  const ruined = new Set(order.filter((_, k) => (k * 37) % 100 < (done ? done.pct : pct)).map((b) => b.id));
  const starsFor = (p: number) => (p >= 100 ? '★★★' : p >= 75 ? '★★☆' : p >= 40 ? '★☆☆' : '☆☆☆');

  return (
    <main className="screen" style={{ paddingBottom: 32, gap: 16, background: '#1a1f2e' }}>
      <Header back="#/aldea" title="Fortaleza de la Niebla">
        <span className="lcd" style={{ padding: '5px 9px', fontSize: 18, lineHeight: 1 }}>
          ATAQUES {left}/2
        </span>
      </Header>

      <div style={{ position: 'relative', margin: '0 -20px' }}>
        <IsoMap buildings={FORTRESS} buildingStyle={(b) => ({ filter: ruined.has(b.id) ? 'grayscale(1) brightness(0.45)' : 'saturate(0.55) hue-rotate(20deg) brightness(0.85)' })}>
          {SPOTS.slice(0, hits).map(([x, y], k) => (
            <img key={k} src="img/iso/v-arquera.png" alt="" style={{ position: 'absolute', left: x, top: y, width: 10, height: 22 }} />
          ))}
        </IsoMap>
        <div className="lcd" style={{ position: 'absolute', right: 20, top: 0, padding: '6px 10px', textAlign: 'right', lineHeight: 1 }}>
          <div style={{ fontSize: 30, color: 'var(--text)' }}>{done ? done.pct : pct}%</div>
          <div style={{ fontSize: 20, color: 'var(--gold)', letterSpacing: 2 }}>{starsFor(done ? done.pct : pct)}</div>
        </div>
      </div>

      {!quiz && !done && (
        <div className="lcd" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 19 }}>
          <div>&gt; CADA PREGUNTA DE REPASO ACERTADA LANZA UNA ARQUERA.</div>
          <div style={{ color: 'var(--dim)' }}>
            TROPAS: {state.village.troops} · SE ENTRENAN ESTUDIANDO (10 ACIERTOS = 1)
          </div>
          {state.cards.length < 4 ? (
            <div style={{ color: 'var(--coral)' }}>NECESITAS AL MENOS 4 TARJETAS PARA ATACAR.</div>
          ) : left === 0 ? (
            <div style={{ color: 'var(--coral)' }}>YA HAS ATACADO 2 VECES HOY. ¡A ESTUDIAR!</div>
          ) : state.village.troops === 0 ? (
            <div style={{ color: 'var(--coral)' }}>SIN TROPAS. ESTUDIA PARA ENTRENARLAS.</div>
          ) : (
            <button className="btn gold" onClick={start}>
              Empezar ataque
            </button>
          )}
        </div>
      )}

      {quiz && !done && (
        <>
          <div className="lcd" style={{ padding: 14 }}>
            <div style={{ fontSize: 17, color: 'var(--dim)' }}>
              PREGUNTA {pos + 1}/{quiz.length} · ¿QUÉ SIGNIFICA?
            </div>
            <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 19, color: 'var(--text)' }}>{quiz[pos].prompt}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {quiz[pos].options.map((o, k) => {
              const it = quiz[pos];
              const bg = picked === null ? 'var(--paper)' : k === it.answer ? 'var(--mint)' : k === picked ? 'var(--coral)' : '#7f93a5';
              return (
                <button
                  key={k}
                  className="px"
                  style={{ border: 0, cursor: 'pointer', textAlign: 'left', padding: '12px 14px', fontWeight: 600, fontSize: 14, background: bg }}
                  onClick={() => {
                    if (picked !== null) return;
                    setPicked(k);
                    if (k === it.answer) setHits((h) => h + 1);
                  }}
                >
                  {o}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <button
              className="btn block"
              onClick={() => {
                const finalHits = hits;
                if (pos + 1 >= quiz.length) finish(finalHits);
                else {
                  setPos(pos + 1);
                  setPicked(null);
                }
              }}
            >
              {pos + 1 >= quiz.length ? 'Ver resultado' : 'Siguiente pregunta'}
            </button>
          )}
        </>
      )}

      {done && (
        <>
          <div className="lcd" style={{ padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 22, color: 'var(--dim)' }}>ATAQUE TERMINADO</div>
            <div style={{ fontSize: 44, color: 'var(--gold)', letterSpacing: 4, lineHeight: 1 }}>{starsFor(done.pct)}</div>
            <div className="row" style={{ fontSize: 26, color: 'var(--text)' }}>
              <img src="img/sprites/s-moneda.svg" alt="" width={26} height={26} />+{done.loot} MONEDAS
            </div>
          </div>
          <a className="btn gold block" href="#/aldea">
            Volver a mi aldea
          </a>
        </>
      )}
    </main>
  );
}
