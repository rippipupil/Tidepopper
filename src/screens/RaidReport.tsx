import { useEffect } from 'react';
import { useApp } from '../data/store';
import { cracks, markRaidSeen } from '../data/actions';
import { CATALOG, sprite } from '../logic/village';
import { Header } from '../components/ui';

export default function RaidReport() {
  const { state, update } = useApp();
  const raid = state.village.raid;
  useEffect(() => {
    if (raid && !raid.seen) update(markRaidSeen);
  }, [raid, update]);
  const defenses = state.village.buildings.filter((b) => CATALOG[b.type].defense);
  const nowCracks = cracks(state, Date.now());

  return (
    <main className="screen" style={{ background: '#1a1f2e' }}>
      <Header back="#/aldea" title="Informe de la Niebla" />
      {!raid ? (
        <p className="muted">La Niebla todavía no ha atacado. Mantén tus tarjetas al día y no lo hará.</p>
      ) : (
        <>
          <div className="row" style={{ gap: 16 }}>
            <img src="img/sprites/s-niebla.svg" alt="La Niebla del Olvido" width={96} height={96} />
            <div>
              <h2 style={{ fontSize: 20 }}>La Niebla del Olvido atacó tu aldea</h2>
              <div className="vt" style={{ fontSize: 22, color: 'var(--glow)', marginTop: 6 }}>
                DEFENSA {raid.defense}% · {raid.cracks} GRIETAS
              </div>
            </div>
          </div>
          <div className="lcd" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 20 }}>
            {defenses.map((b) => {
              const st = state.studies.find((s) => s.id === b.studyId);
              return (
                <div key={b.id} className="row">
                  <img src={sprite(b.type).src} alt="" style={{ height: 32, width: 'auto' }} />
                  <span className="grow">
                    {CATALOG[b.type].name.toUpperCase()} · {st ? st.name.toUpperCase() : 'SIN ESTUDIO'}
                  </span>
                </div>
              );
            })}
            {defenses.length === 0 && <div style={{ color: 'var(--coral)' }}>NO TENÍAS DEFENSAS.</div>}
            <div className="row">
              <img src={sprite('almacen').src} alt="" style={{ height: 32, width: 'auto' }} />
              <span className="grow">ALMACÉN</span>
              <span style={{ color: raid.stolen ? 'var(--coral)' : 'var(--mint)' }}>{raid.stolen ? `−${raid.stolen} MONEDAS` : 'INTACTO'}</span>
            </div>
          </div>
          <div className="px" style={{ padding: '14px 16px', fontSize: 14.5, lineHeight: 1.45 }}>
            Cada grieta es una tarjeta que te tocaba repasar y no repasaste. Cuanto más recuerdas de los estudios que alimentan tus defensas, menos roba. Los muros también ayudan.
          </div>
          {nowCracks > 0 ? (
            <a className="btn block" href="#/estudios">
              Reparar · {nowCracks} tarjetas por repasar
            </a>
          ) : (
            <div className="lcd" style={{ padding: 14, fontSize: 19, color: 'var(--mint)' }}>
              &gt; YA NO QUEDAN GRIETAS. ¡BIEN DEFENDIDO!
            </div>
          )}
        </>
      )}
    </main>
  );
}
