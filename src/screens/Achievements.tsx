import { useApp } from '../data/store';
import { achievementsStatus, claimAchievement } from '../data/actions';
import { CATALOG } from '../logic/village';
import { Header, Nav } from '../components/ui';

export default function Achievements() {
  const { state, update } = useApp();
  const list = achievementsStatus(state);
  const t = state.progress.totals;
  return (
    <main className="screen">
      <Header back="#/ajustes" title="Logros" />
      <div className="lcd" style={{ padding: 14, fontSize: 18, lineHeight: 1.3 }}>
        &gt; {list.filter((a) => a.claimed).length}/{list.length} LOGROS · {t.reviews} REPASOS · {t.games} PARTIDAS · {t.letters} LETRAS · {t.levels} NIVELES · {t.exams} EXÁMENES
      </div>
      {list.map((a) => (
        <article key={a.id} className="px row" style={{ padding: '12px 14px', gap: 12, opacity: a.done || a.claimed ? 1 : 0.6 }}>
          <img src="img/sprites/s-xp.svg" alt="" width={34} height={34} style={{ filter: a.claimed ? undefined : 'grayscale(1)' }} />
          <div className="grow">
            <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 16 }}>{a.name}</div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>
              {a.desc}
              {a.unlocks ? ` · Desbloquea: ${CATALOG[a.unlocks].name}` : ''}
            </div>
          </div>
          {a.claimed ? (
            <span className="vt" style={{ color: '#4f8a76', fontSize: 18 }}>
              HECHO
            </span>
          ) : a.done ? (
            <button className="btn gold" style={{ minHeight: 38, padding: '4px 10px', fontSize: 14 }} onClick={() => update((s) => claimAchievement(s, a.id))}>
              +{a.gems}
              <img src="img/sprites/s-cristal.svg" alt="cristales" width={16} height={16} />
            </button>
          ) : (
            <span className="vt" style={{ color: 'var(--ink-soft)', fontSize: 18 }}>
              +{a.gems}
            </span>
          )}
        </article>
      ))}
      <Nav active="perfil" />
    </main>
  );
}
