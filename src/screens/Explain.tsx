import { useState } from 'react';
import { useApp } from '../data/store';
import { finishSession, studyCards } from '../data/actions';
import type { Correction } from '../ai/claude';
import { Header } from '../components/ui';
import { Missing } from './StudyView';

export default function Explain({ id }: { id: string }) {
  const { state, update } = useApp();
  const study = state.studies.find((s) => s.id === id);
  const cards = studyCards(state, id);
  // Empieza por lo que menos recuerdas.
  const pickCard = () => cards.slice().sort((a, b) => a.sched.reps - b.sched.reps || b.sched.lapses - a.sched.lapses)[Math.floor(Math.random() * Math.min(5, cards.length))];
  const [card, setCard] = useState(pickCard);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Correction | null>(null);
  const [err, setErr] = useState('');
  if (!study || !card) return <Missing />;

  const send = async () => {
    if (!state.settings.apiKey) {
      setErr('Pon tu clave de Claude en Perfil → Ajustes para que la IA te corrija.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const { correctExplanation } = await import('../ai/claude');
      const r = await correctExplanation(state.settings.apiKey, card.front, card.back, answer);
      setResult(r);
      const good = r.score >= 7 ? 1 : 0;
      update((s) => finishSession(s, good * 3, 3, Date.now(), 'game').state);
    } catch (e) {
      const { describeAiError } = await import('../ai/claude');
      setErr(describeAiError(e));
    } finally {
      setBusy(false);
    }
  };

  const nextOne = () => {
    setCard(pickCard());
    setAnswer('');
    setResult(null);
  };

  const line = (tag: string, color: string, items: string[]) =>
    items.map((t, k) => (
      <div key={tag + k} className="row" style={{ alignItems: 'baseline', gap: 10, fontSize: 15, color: 'var(--text)', fontFamily: 'var(--f-body)' }}>
        <span className="vt" style={{ width: 58, flex: 'none', color }}>
          {tag}
        </span>
        <span>{t}</span>
      </div>
    ));

  return (
    <main className="screen" style={{ paddingBottom: 32 }}>
      <Header back={`#/estudio/${id}/juegos`} title="Explícalo tú" />
      <div>
        <div className="muted">Explica con tus palabras:</div>
        <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 30 }}>{card.front}</div>
      </div>
      {!result ? (
        <>
          <label className="sr" htmlFor="exp">
            Tu explicación
          </label>
          <textarea id="exp" className="field" style={{ minHeight: 200, background: 'var(--paper)', color: 'var(--ink)', boxShadow: 'inset 4px 4px 0 var(--paper-hi), 0 -4px 0 var(--outline), 0 4px 0 var(--outline), -4px 0 0 var(--outline), 4px 0 0 var(--outline)' }} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Como si se lo contaras a un amigo…" />
          {err && (
            <div className="lcd toast" role="status" style={{ color: 'var(--coral)', fontSize: 19 }}>
              {err}
            </div>
          )}
          <button className="btn gold block" style={{ marginTop: 'auto' }} disabled={busy || answer.trim().length < 15} onClick={() => void send()}>
            {busy ? 'Corrigiendo…' : 'Corregir'}
          </button>
        </>
      ) : (
        <>
          <div className="px" style={{ padding: 18, fontSize: 16, lineHeight: 1.55 }}>
            {answer}
          </div>
          <div className="lcd" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 20, color: 'var(--dim)' }}>&gt; CORRECCIÓN IA</span>
              <span style={{ fontSize: 30 }}>{result.score}/10</span>
            </div>
            {line('BIEN', 'var(--mint)', result.good)}
            {line('FALTA', 'var(--gold)', result.missing)}
            {line('ERROR', 'var(--coral)', result.errors)}
          </div>
          <details className="px" style={{ padding: '12px 16px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Ver respuesta modelo</summary>
            <p style={{ marginBottom: 0 }}>{result.model}</p>
          </details>
          <div className="row" style={{ marginTop: 'auto' }}>
            <button className="btn ghost grow" onClick={() => setResult(null)}>
              Reintentar
            </button>
            <button className="btn grow" onClick={nextOne}>
              Otro concepto
            </button>
          </div>
        </>
      )}
    </main>
  );
}
