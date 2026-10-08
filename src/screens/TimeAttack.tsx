import { useEffect, useState } from 'react';
import { useApp } from '../data/store';
import { finishSession, studyCards } from '../data/actions';
import { buildQuiz } from '../logic/quiz';
import { go } from '../router';
import { Header } from '../components/ui';
import { Missing } from './StudyView';
import { rewardUrl } from './Review';

const SECONDS = 10;

export default function TimeAttack({ id }: { id: string }) {
  const { state, update } = useApp();
  const study = state.studies.find((s) => s.id === id);
  const [quiz] = useState(() => buildQuiz(studyCards(state, id), 8));
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [time, setTime] = useState(SECONDS);
  const [correct, setCorrect] = useState(0);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (picked !== null || time === 0) return;
    const t = window.setTimeout(() => setTime((x) => x - 1), 1000);
    return () => window.clearTimeout(t);
  }, [time, picked]);

  if (!study) return <Missing />;
  if (quiz.length === 0)
    return (
      <main className="screen">
        <Header back={`#/estudio/${id}`} title="Contrarreloj" />
        <p className="muted">Necesitas al menos 4 tarjetas con respuestas distintas.</p>
      </main>
    );

  const item = quiz[pos];
  const answered = picked !== null || time === 0;
  const pick = (k: number) => {
    if (answered) return;
    setPicked(k);
    if (k === item.answer) {
      setCorrect((c) => c + 1);
      setScore((s) => s + 60 + time * 10);
    }
  };
  const next = () => {
    if (pos + 1 < quiz.length) {
      setPos(pos + 1);
      setPicked(null);
      setTime(SECONDS);
      return;
    }
    const now = Date.now();
    const { reward } = finishSession(state, correct, quiz.length, now, 'game');
    update((s) => finishSession(s, correct, quiz.length, now, 'game').state);
    go(rewardUrl(id, correct, quiz.length, reward));
  };
  const msg = picked === item.answer ? `¡BIEN! +${60 + time * 10}` : picked !== null ? 'CASI. ERA LA OTRA' : time === 0 ? '¡TIEMPO!' : 'ELIGE ANTES DE QUE SE ACABE';
  const msgColor = picked === item.answer ? 'var(--mint)' : answered ? 'var(--coral)' : 'var(--text-soft)';

  return (
    <main className="screen" style={{ paddingBottom: 32 }}>
      <Header back={`#/estudio/${id}/juegos`} title="Contrarreloj">
        <span className="vt" style={{ fontSize: 24, color: 'var(--glow)' }}>
          {score} PTS
        </span>
      </Header>
      <div className="row" style={{ gap: 4 }}>
        {Array.from({ length: SECONDS }, (_, k) => (
          <div key={k} style={{ flex: 1, height: 14, background: k < time ? (time <= 3 ? 'var(--coral)' : 'var(--blue-hi)') : 'var(--lcd-hi)' }} />
        ))}
      </div>
      <section className="lcd" style={{ padding: '26px 18px', textAlign: 'center' }}>
        <div style={{ fontSize: 19, color: 'var(--dim)' }}>
          {pos + 1}/{quiz.length} · ¿QUÉ SIGNIFICA?
        </div>
        <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 26, color: 'var(--text)', marginTop: 8 }}>{item.prompt}</div>
      </section>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {item.options.map((o, k) => {
          const bg = !answered ? 'var(--paper)' : k === item.answer ? 'var(--mint)' : k === picked ? 'var(--coral)' : '#7f93a5';
          return (
            <button key={k} className="px" onClick={() => pick(k)} style={{ border: 0, cursor: 'pointer', textAlign: 'left', padding: '14px 16px', fontSize: 15, fontWeight: 600, background: bg }}>
              {o}
            </button>
          );
        })}
      </div>
      <div className="vt" role="status" style={{ textAlign: 'center', fontSize: 22, color: msgColor }}>
        {msg}
      </div>
      {answered && (
        <button className="btn block" onClick={next}>
          {pos + 1 < quiz.length ? 'Siguiente' : 'Terminar'}
        </button>
      )}
    </main>
  );
}
