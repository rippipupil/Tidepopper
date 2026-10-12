import { Check, Lock, Play } from 'lucide-react';
import { courseProgress, levelState, totalStars } from '../../logic/course';
import type { Note } from '../../data/types';

/** Mapa del curso: niveles en orden, el actual resaltado y los siguientes bloqueados. */
export default function LessonsTab({ note }: { note: Note }) {
  const c = note.course!;
  const pct = courseProgress(c);
  return (
    <div className="col fadein" style={{ gap: 16 }}>
      <section className="card pad col" style={{ gap: 10 }}>
        <p className="muted">{c.description}</p>
        <div className="row">
          <div className="grow bar">
            <span style={{ width: `${pct}%`, background: 'var(--good)' }} />
          </div>
          <span className="small muted">{pct}%</span>
          <span className="tag pill-warn">★ {totalStars(c)}</span>
        </div>
      </section>
      <div className="level-path">
        {c.levels.map((l, i) => {
          const st = levelState(c, i);
          const inner = (
            <>
              <span className={`level-dot ${st === 'done' ? 'done' : st === 'current' ? 'current' : ''}`}>{st === 'done' ? <Check size={22} /> : st === 'locked' ? <Lock size={18} /> : i + 1}</span>
              <span className="grow" style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 650, color: st === 'locked' ? 'var(--faint)' : 'var(--text)' }}>
                  Nivel {i + 1} · {l.title}
                </span>
                <span className="muted small">{l.goal}</span>
              </span>
              {st === 'done' && <span className="tag pill-warn">{'★'.repeat(l.stars)}</span>}
              {st === 'current' && (
                <span className="btn sm">
                  <Play size={14} fill="currentColor" /> Empezar
                </span>
              )}
            </>
          );
          return st === 'locked' ? (
            <div key={i} className="card level" style={{ opacity: 0.6 }}>
              {inner}
            </div>
          ) : (
            <a key={i} href={`#/nota/${note.id}/nivel/${i}`} className="card click level">
              {inner}
            </a>
          );
        })}
      </div>
    </div>
  );
}
