import { useApp } from '../data/store';
import { studyMemory } from '../data/actions';
import { levelInfo } from '../logic/rewards';
import { Progress } from '../components/ui';

export default function RewardView({ q }: { q: URLSearchParams }) {
  const { state } = useApp();
  const n = (k: string) => Number(q.get(k) ?? 0);
  const studyId = q.get('e') ?? '';
  const study = state.studies.find((s) => s.id === studyId);
  const lvl = levelInfo(state.wallet.xp);
  const m = study ? studyMemory(state, study.id, Date.now()) : null;
  const star = (k: number) => (
    <img src="img/sprites/s-xp.svg" alt={k <= n('s') ? `Estrella ${k} conseguida` : `Estrella ${k} sin conseguir`} style={{ width: k === 2 ? 96 : 72, height: k === 2 ? 96 : 72, marginBottom: k === 2 ? 14 : 0, filter: k <= n('s') ? undefined : 'grayscale(1) brightness(0.45)' }} />
  );

  return (
    <main className="screen" style={{ paddingTop: 40, paddingBottom: 32 }}>
      <div style={{ textAlign: 'center' }}>
        <div className="vt" style={{ fontSize: 22, color: 'var(--dim)' }}>
          {study ? study.name.toUpperCase() + ' · ' : ''}
          {n('ok')}/{n('t')} ACIERTOS
        </div>
        <h1 style={{ fontSize: 32, marginTop: 4 }}>¡Sesión completada!</h1>
      </div>
      <div className="row" style={{ justifyContent: 'center', alignItems: 'flex-end', gap: 14 }}>
        {star(1)}
        {star(2)}
        {star(3)}
      </div>
      <div className="lcd" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16, fontSize: 22 }}>
        <div className="row">
          <img src="img/sprites/s-moneda.svg" alt="" width={32} height={32} />
          MONEDAS<b style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 28, color: 'var(--gold)' }}>+{n('c')}</b>
        </div>
        <div className="row">
          <img src="img/sprites/s-xp.svg" alt="" width={32} height={32} />
          EXPERIENCIA<b style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 28 }}>+{n('x')}</b>
        </div>
        {n('g') > 0 && (
          <div className="row">
            <img src="img/sprites/s-cristal.svg" alt="" width={32} height={32} />
            CRISTALES<b style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 28 }}>+{n('g')}</b>
          </div>
        )}
        <div style={{ fontSize: 18, color: 'var(--dim)' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>NIVEL {lvl.level}</span>
            <span>
              {lvl.into}/{lvl.need} XP
            </span>
          </div>
          <Progress value={(100 * lvl.into) / lvl.need} color="var(--gold)" track="var(--lcd-hi)" height={10} />
        </div>
      </div>
      {study && m !== null && (
        <div className="px row" style={{ padding: '14px 16px', gap: 14 }}>
          <img src="img/iso/v-canon.png" alt="" style={{ width: 60, height: 48 }} />
          <div style={{ fontSize: 14.5, lineHeight: 1.4 }}>
            Las defensas que alimenta <strong>{study.name}</strong> están al <strong>{m}%</strong>. Además has entrenado tropas: tienes {state.village.troops}.
          </div>
        </div>
      )}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <a className="btn gold block" href="#/aldea">
          Ir a mi aldea
        </a>
        <a href={study ? `#/estudio/${study.id}` : '#/'} style={{ textAlign: 'center', fontWeight: 600 }}>
          Seguir estudiando
        </a>
      </div>
    </main>
  );
}
