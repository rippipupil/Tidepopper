import { useApp } from '../data/store';
import { courseProgress, currentLevel, levelState, totalStars } from '../logic/course';
import { Header, icon, Nav, Progress } from '../components/ui';
import { Missing } from './StudyView';

const isle = (bg: string, extra: React.CSSProperties = {}): React.CSSProperties => ({
  width: 56,
  height: 56,
  flex: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--f-display)',
  fontWeight: 700,
  fontSize: 22,
  color: 'var(--outline)',
  background: bg,
  boxShadow: 'inset 3px 3px 0 rgba(255,255,255,.4), inset -3px -3px 0 rgba(15,24,35,.25), 0 -4px 0 var(--outline), 0 4px 0 var(--outline), -4px 0 0 var(--outline), 4px 0 0 var(--outline), 0 9px 0 rgba(5,10,18,.45)',
  ...extra,
});

export default function CourseView({ id }: { id: string }) {
  const { state } = useApp();
  const study = state.studies.find((s) => s.id === id);
  if (!study?.course) return <Missing />;
  const c = study.course;
  const cur = currentLevel(c);

  return (
    <main className="screen">
      <Header back="#/curso/nuevo" title={study.name}>
        <span className="vt" style={{ fontSize: 20, color: 'var(--gold)' }}>
          ★ {totalStars(c)}/{c.levels.length * 3}
        </span>
      </Header>
      <div className="lcd" style={{ padding: '12px 16px', fontSize: 19, lineHeight: 1.2 }}>
        <div>&gt; {cur >= c.levels.length ? '¡CURSO COMPLETADO!' : `VAS POR EL NIVEL ${cur + 1} DE ${c.levels.length}`}</div>
        <div style={{ color: 'var(--dim)', fontFamily: 'var(--f-body)', fontSize: 14, marginTop: 6 }}>{c.description}</div>
        <div style={{ marginTop: 10 }}>
          <Progress value={courseProgress(c)} color="var(--mint)" track="var(--lcd-hi)" />
        </div>
      </div>

      <ol style={{ listStyle: 'none', margin: 0, padding: '0 0 0 8px', position: 'relative', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div aria-hidden="true" style={{ position: 'absolute', left: 34, top: 20, bottom: 20, width: 4, background: 'repeating-linear-gradient(180deg, var(--blue-sh) 0 8px, transparent 8px 14px)' }} />
        {c.levels.map((l, i) => {
          const st = levelState(c, i);
          return (
            <li key={i} className="row" style={{ gap: 18, position: 'relative', marginLeft: i % 2 ? 22 : 0 }}>
              {st === 'done' ? (
                <a href={`#/curso/${id}/nivel/${i}`} style={isle('var(--mint)')} aria-label={`Nivel ${i + 1}, completado. Repetir`}>
                  <img src={icon('check')} alt="" width={30} height={30} />
                </a>
              ) : st === 'current' ? (
                <a href={`#/curso/${id}/nivel/${i}`} style={isle('var(--blue-hi)', { width: 66, height: 66, boxShadow: 'inset 3px 3px 0 #b4d4ea, inset -3px -3px 0 var(--blue), 0 -4px 0 var(--outline), 0 4px 0 var(--outline), -4px 0 0 var(--outline), 4px 0 0 var(--outline), 0 0 0 10px rgba(143,184,214,0.18), 0 12px 0 rgba(5,10,18,.45)' })} aria-label={`Nivel ${i + 1}, jugar`}>
                  {i + 1}
                </a>
              ) : (
                <span style={isle('var(--lcd-hi)')} aria-label={`Nivel ${i + 1}, bloqueado`}>
                  <img src={icon('lock')} alt="" width={30} height={30} style={{ opacity: 0.6 }} />
                </span>
              )}
              <div className="grow">
                <div style={{ fontWeight: 600, color: st === 'locked' ? 'var(--dim)' : 'var(--text)' }}>{l.title}</div>
                <div className="vt" style={{ fontSize: 17, color: st === 'done' ? 'var(--gold)' : 'var(--dim)' }}>
                  {st === 'done' ? '★'.repeat(l.stars) + '☆'.repeat(3 - l.stars) : st === 'current' ? 'AQUÍ ESTÁS' : 'BLOQUEADO'}
                </div>
              </div>
              {st === 'current' && (
                <a className="btn" href={`#/curso/${id}/nivel/${i}`}>
                  Jugar
                </a>
              )}
            </li>
          );
        })}
      </ol>

      <div className="grid2" style={{ gap: 16 }}>
        <a className="btn ghost" href={`#/estudio/${id}/chat`}>
          Preguntar
        </a>
        <a className="btn ghost" href={`#/estudio/${id}`}>
          Repaso y examen
        </a>
      </div>
      <Nav active="estudios" />
    </main>
  );
}
