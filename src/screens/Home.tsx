import { useApp } from '../data/store';
import { cracks, studyMemory } from '../data/actions';
import { sessionQueue } from '../logic/srs';
import { levelInfo } from '../logic/rewards';
import { daysUntil } from '../logic/exam';
import { Coins, folderIcon, icon, Nav } from '../components/ui';

export default function Home() {
  const { state } = useApp();
  const now = Date.now();
  const lvl = levelInfo(state.wallet.xp);
  const next = state.studies
    .map((s) => ({ s, n: sessionQueue(state.cards.filter((c) => c.studyId === s.id), now).length }))
    .sort((a, b) => b.n - a.n)[0];
  const grietas = cracks(state, now);

  return (
    <main className="screen">
      <header className="row">
        <img src={icon('app')} alt="" width={40} height={40} />
        <div className="grow" style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 20, letterSpacing: 1 }}>
          TIDEPOPPER
        </div>
        <span className="lcd" style={{ padding: '6px 10px', fontSize: 20, lineHeight: 1 }}>
          RACHA {String(state.streak.days).padStart(2, '0')}
        </span>
      </header>

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="vt muted">
          NIVEL {lvl.level} · {lvl.into}/{lvl.need} XP
        </span>
        <Coins value={state.wallet.coins} />
      </div>

      <h1 style={{ fontSize: 26 }}>Hola. ¿Qué estudiamos hoy?</h1>

      {next && next.n > 0 ? (
        <a href={`#/estudio/${next.s.id}/repaso`} className="lcd row" style={{ textDecoration: 'none', padding: 18, gap: 14 }}>
          <div className="grow">
            <div style={{ fontSize: 18, color: 'var(--dim)' }}>&gt; CONTINUAR</div>
            <div style={{ fontSize: 26, lineHeight: 1.05 }}>{next.s.name.toUpperCase()}</div>
            <div style={{ fontSize: 18, color: 'var(--gold)' }}>{next.n} TARJETAS · +{next.n * 10} MONEDAS</div>
          </div>
          <span className="btn" aria-hidden="true">
            Seguir
          </span>
        </a>
      ) : (
        <div className="lcd" style={{ padding: 18, fontSize: 20 }}>
          &gt; {state.studies.length ? 'TODO AL DÍA. AÑADE APUNTES O JUEGA.' : 'CREA TU PRIMER ESTUDIO PARA EMPEZAR.'}
        </div>
      )}

      <div className="grid2">
        <a href="#/estudios?nuevo=1" className="px tile">
          <img src={icon('doc')} alt="" />
          Mis documentos
        </a>
        <a href="#/curso/nuevo" className="px tile">
          <img src={icon('ai')} alt="" />
          Asistente IA
        </a>
      </div>

      {state.village.raid && !state.village.raid.seen && (
        <a href="#/asalto" className="lcd row" style={{ textDecoration: 'none', padding: '10px 12px' }}>
          <img src="img/sprites/s-niebla.svg" alt="" width={32} height={32} />
          <span className="grow" style={{ fontSize: 19, color: 'var(--coral)' }}>
            ¡LA NIEBLA ATACÓ ESTA NOCHE! VER INFORME
          </span>
        </a>
      )}
      {grietas > 0 && (
        <a href="#/aldea" className="lcd row" style={{ textDecoration: 'none', padding: '10px 12px' }}>
          <img src="img/sprites/s-niebla.svg" alt="" width={32} height={32} />
          <span className="grow" style={{ fontSize: 19, color: 'var(--coral)' }}>
            {grietas} TARJETAS SIN REPASAR · LA NIEBLA SE ACERCA
          </span>
        </a>
      )}

      <section>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
          <h2>Mis estudios</h2>
          <a href="#/estudios" style={{ fontSize: 13 }}>
            Ver todos
          </a>
        </div>
        {state.studies.slice(0, 4).map((s) => {
          const m = studyMemory(state, s.id, now);
          return (
            <a key={s.id} href={s.course ? `#/curso/${s.id}` : `#/estudio/${s.id}`} className="row" style={{ textDecoration: 'none', color: 'var(--text)', padding: '12px 2px', borderBottom: '2px dashed var(--lcd-hi)', fontWeight: 600 }}>
              <img src={folderIcon(s.color)} alt="" width={26} height={26} />
              <span className="grow">{s.name}</span>
              {s.examDate && daysUntil(s.examDate, now) >= 0 && (
                <span className="vt" style={{ color: 'var(--gold)', fontSize: 17 }}>
                  EXAMEN {daysUntil(s.examDate, now) === 0 ? 'HOY' : `EN ${daysUntil(s.examDate, now)} D`}
                </span>
              )}
              <span className="vt" style={{ color: 'var(--glow)' }}>
                {m === null ? '—' : `${m}%`}
              </span>
            </a>
          );
        })}
        {state.studies.length === 0 && <p className="muted">Aún no tienes estudios.</p>}
      </section>
      <Nav active="inicio" />
    </main>
  );
}
