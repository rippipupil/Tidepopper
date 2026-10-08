import { useApp } from '../../data/store';
import { finishSession, type SessionKind } from '../../data/actions';
import { go } from '../../router';
import { rewardUrl } from '../Review';

/** Cierra una partida: recompensa, estadísticas y pantalla de recompensa. */
export function useFinish(studyId: string) {
  const { state, update } = useApp();
  return (correct: number, total: number, kind: SessionKind = 'game') => {
    const now = Date.now();
    const { reward } = finishSession(state, correct, total, now, kind);
    update((s) => finishSession(s, correct, total, now, kind).state);
    go(rewardUrl(studyId, correct, total, reward));
  };
}

export function Feedback({ ok, text }: { ok: boolean | null; text: string }) {
  return (
    <div className="lcd toast" role="status" style={{ fontSize: 19, color: ok === null ? 'var(--text-soft)' : ok ? 'var(--mint)' : 'var(--coral)' }}>
      {text}
    </div>
  );
}

export const optionStyle = (bg: string): React.CSSProperties => ({ border: 0, cursor: 'pointer', textAlign: 'left', padding: '14px 16px', fontSize: 15, fontWeight: 600, background: bg });
