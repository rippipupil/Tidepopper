import { useState } from 'react';
import { useApp } from '../data/store';
import { build, collect, cracks, linkDefense, moveBuilding, REMOVE_COST, removeObstacle, studyMemory, upgradeBuilding, upgradeLab } from '../data/actions';
import { builders, busyBuilders, canUpgrade, labUpgradeCost, maxLevel, mineAvailable, mineCap, townHallLevel, upgradeCost, upgradeMinutes } from '../logic/economy';
import { formatWait, useNow } from '../hooks';
import { uid } from '../data/db';
import { attacksLeft, dayKey, levelInfo } from '../logic/rewards';
import { canBuild, CATALOG, count, findSpot, GRID, isFree, project, size, sprite, spriteFor } from '../logic/village';
import { Coins, Nav } from '../components/ui';
import IsoMap from '../components/IsoMap';

type Mode = { kind: 'view' } | { kind: 'shop' } | { kind: 'sel'; id: string } | { kind: 'place'; type: string; i: number; j: number; moveId?: string };

const SHOP = ['canon', 'arqueras', 'catapulta', 'ballesta', 'torre_magica', 'muro', 'mina', 'almacen', 'cuartel', 'laboratorio', 'cabana', 'arbol', 'flores', 'farol', 'bandera', 'estatua', 'fuente'];
const UPGRADE_MSG = { max: 'NIVEL MÁXIMO (SUBE EL AYUNTAMIENTO)', coins: 'TE FALTAN MONEDAS', builders: 'TODOS LOS CONSTRUCTORES OCUPADOS', busy: 'YA ESTÁ EN OBRAS' } as const;

export default function VillageView() {
  const { state, update } = useApp();
  const [mode, setMode] = useState<Mode>({ kind: 'view' });
  const [zoom, setZoom] = useState(1);
  const [note, setNote] = useState('');
  const now = useNow();
  const v = state.village;
  const th = townHallLevel(v.buildings);
  const studiedToday = state.streak.lastDay === dayKey(now);
  const lvl = levelInfo(state.wallet.xp);
  const left = attacksLeft(v, dayKey(now));
  const grietas = cracks(state, now);
  const defenses = v.buildings.filter((b) => CATALOG[b.type].defense);
  const power = (studyId?: string) => (studyId ? studyMemory(state, studyId, now) : null);

  const shown = mode.kind === 'place' && mode.moveId ? v.buildings.filter((b) => b.id !== mode.moveId) : v.buildings;
  const placeOk = mode.kind === 'place' && isFree(v.buildings, mode.type, mode.i, mode.j, mode.moveId);

  const confirmPlace = () => {
    if (mode.kind !== 'place' || !placeOk) return;
    if (mode.moveId) update((s) => moveBuilding(s, mode.moveId!, mode.i, mode.j));
    else {
      const id = uid();
      update((s) => build(s, mode.type, mode.i, mode.j, id).state);
      if (CATALOG[mode.type].defense && state.studies.length) setNote('Toca la defensa nueva para elegir qué estudio la alimenta.');
    }
    setMode({ kind: 'view' });
  };

  const sel = mode.kind === 'sel' ? v.buildings.find((b) => b.id === mode.id) : undefined;

  return (
    <main className="screen" style={{ paddingLeft: 0, paddingRight: 0, gap: 14 }}>
      <header style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="row" style={{ gap: 10 }}>
          <div className="lcd row grow" style={{ padding: '6px 8px', gap: 8 }}>
            <img src="img/sprites/s-xp.svg" alt="" width={26} height={26} />
            <div className="grow" style={{ lineHeight: 1 }}>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: 18 }}>
                <span>NIVEL {lvl.level}</span>
                <span style={{ color: 'var(--dim)' }}>
                  {lvl.into}/{lvl.need}
                </span>
              </div>
              <div className="bar" style={{ marginTop: 3 }}>
                <div style={{ flex: lvl.into, background: 'var(--gold)' }} />
                <div style={{ flex: lvl.need - lvl.into, background: 'var(--lcd-hi)' }} />
              </div>
            </div>
          </div>
          <Coins value={state.wallet.coins} />
          <span className="lcd row" style={{ gap: 6, padding: '4px 8px 4px 4px', fontSize: 21, lineHeight: 1 }}>
            <img src="img/sprites/s-cristal.svg" alt="Cristales" width={22} height={22} />
            {state.wallet.gems}
          </span>
        </div>
        <div className="row vt" style={{ justifyContent: 'space-between', fontSize: 18 }}>
          <span className="muted">
            TROPAS {v.troops} · ATAQUES {left}/2 · OBRAS {busyBuilders(v.buildings, now)}/{builders(v.buildings)}
          </span>
          <button className="lcd" style={{ border: 0, cursor: 'pointer', padding: '3px 10px', fontSize: 18 }} onClick={() => setZoom(zoom === 1 ? 2 : 1)}>
            ZOOM {zoom}X
          </button>
        </div>
      </header>

      <div style={{ overflow: 'auto', padding: '6px 0' }}>
        <IsoMap
          buildings={shown}
          zoom={zoom}
          selectedId={sel?.id}
          ghost={mode.kind === 'place' ? { type: mode.type, i: mode.i, j: mode.j, ok: placeOk } : null}
          onBuilding={mode.kind === 'place' ? undefined : (b) => setMode({ kind: 'sel', id: b.id })}
          onTile={mode.kind === 'place' ? (i, j) => setMode({ ...mode, i: Math.min(i, GRID - size(mode.type)), j: Math.min(j, GRID - size(mode.type)) }) : undefined}
          buildingStyle={(b) =>
            (b.upgradeUntil ?? 0) > now ? { filter: 'sepia(0.7) brightness(0.9)' } : CATALOG[b.type].defense && (power(b.studyId) ?? 100) < 50 ? { filter: 'saturate(0.6) brightness(0.8)' } : undefined
          }
        >
          {(() => {
            const barracks = v.buildings.find((b) => b.type === 'cuartel');
            if (!barracks || v.troops === 0) return null;
            const p = project(barracks.i + 3, barracks.j + 1);
            return Array.from({ length: Math.min(8, v.troops) }, (_, k) => (
              <img key={k} src="img/iso/v-arquera.png" alt="" style={{ position: 'absolute', left: p.x - 30 + (k % 4) * 9 + (k >= 4 ? 4 : 0), top: p.y - 6 + (k >= 4 ? 7 : 0), width: 10, height: 22, pointerEvents: 'none' }} />
            ));
          })()}
          {grietas > 0 && (
            <>
              <img className="ghostfog" src="img/sprites/s-niebla.svg" alt="" style={{ left: 336, top: 8, width: 40, height: 40, opacity: 0.75 }} />
              <img className="ghostfog" src="img/sprites/s-niebla.svg" alt="" style={{ left: 6, top: 150, width: 32, height: 32, opacity: 0.5, animationDelay: '1.2s' }} />
            </>
          )}
        </IsoMap>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {note && mode.kind === 'view' && (
          <div className="lcd toast" role="status" style={{ fontSize: 18 }}>
            {note}
          </div>
        )}

        {mode.kind === 'view' && (
          <>
            {v.raid && !v.raid.seen && (
              <a href="#/asalto" className="lcd row" style={{ textDecoration: 'none', padding: '10px 12px' }}>
                <img src="img/sprites/s-niebla.svg" alt="" width={32} height={32} />
                <span className="grow" style={{ fontSize: 19, color: 'var(--coral)' }}>
                  ¡LA NIEBLA ATACÓ! {v.raid.stolen ? `ROBÓ ${v.raid.stolen} MONEDAS` : 'NO PUDO ROBAR'}
                </span>
                <span style={{ fontSize: 19 }}>VER &gt;</span>
              </a>
            )}
            {grietas > 0 ? (
              <a href="#/estudios" className="lcd row" style={{ textDecoration: 'none', padding: '10px 12px' }}>
                <img src="img/sprites/s-niebla.svg" alt="" width={32} height={32} />
                <span className="grow" style={{ fontSize: 19, color: 'var(--coral)' }}>
                  {grietas} GRIETAS · REPASA PARA DEFENDERTE
                </span>
                <span style={{ fontSize: 19 }}>DEFENDER &gt;</span>
              </a>
            ) : (
              <div className="lcd" style={{ padding: '10px 12px', fontSize: 19, color: 'var(--mint)' }}>
                &gt; SIN GRIETAS. LA NIEBLA NO PUEDE ENTRAR.
              </div>
            )}
            <div className="px" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div className="vt" style={{ color: 'var(--ink-soft)', fontSize: 17 }}>
                TUS DEFENSAS · CADA UNA LA ALIMENTA UN ESTUDIO
              </div>
              {defenses.length === 0 && <div style={{ fontSize: 14 }}>Aún no tienes defensas. Constrúyelas con las monedas que ganas estudiando.</div>}
              {defenses.map((b) => {
                const st = state.studies.find((s) => s.id === b.studyId);
                const p = power(b.studyId);
                return (
                  <button key={b.id} className="row" onClick={() => setMode({ kind: 'sel', id: b.id })} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', fontWeight: 600, fontSize: 14, textAlign: 'left', color: 'var(--ink)' }}>
                    <img src={sprite(b.type).src} alt="" style={{ height: 26, width: 'auto' }} />
                    <span className="grow">
                      {CATALOG[b.type].name} · {st ? st.name : 'sin estudio'}
                    </span>
                    <span className="vt" style={{ color: p === null ? 'var(--ink-soft)' : p < 50 ? '#a8695a' : 'var(--blue-sh)' }}>
                      {p === null ? '—' : `${p}%`}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="grid2" style={{ gap: 16 }}>
              <button className="btn gold" onClick={() => setMode({ kind: 'shop' })}>
                Construir
              </button>
              <a className="btn" href="#/ataque" aria-disabled={left === 0 || v.troops === 0} style={{ opacity: left === 0 || v.troops === 0 ? 0.5 : 1 }}>
                Atacar · {left}/2 hoy
              </a>
            </div>
          </>
        )}

        {mode.kind === 'shop' && (
          <>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 19 }}>Construir</h2>
              <button className="btn ghost" style={{ minHeight: 36, padding: '4px 12px' }} onClick={() => setMode({ kind: 'view' })}>
                Cerrar
              </button>
            </div>
            <div className="grid3">
              {SHOP.map((t) => {
                const c = CATALOG[t];
                const n = count(v.buildings, t);
                const locked = canBuild(v.buildings, 1e9, t, -1, -1, state.progress.achievements) === 'locked';
                const ok = !locked && n < c.max && state.wallet.coins >= c.cost;
                return (
                  <button
                    key={t}
                    className="px"
                    disabled={!ok}
                    onClick={() => {
                      const spot = findSpot(v.buildings, t);
                      if (spot) setMode({ kind: 'place', type: t, ...spot });
                      else setNote('No queda sitio libre para este edificio.');
                    }}
                    style={{ border: 0, cursor: ok ? 'pointer' : 'default', opacity: ok ? 1 : 0.45, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px 8px' }}
                  >
                    <img src={sprite(t).src} alt="" style={{ height: 44, width: 'auto' }} />
                    <span style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 13, lineHeight: 1.1, textAlign: 'center' }}>{c.name}</span>
                    <span className="vt" style={{ fontSize: 17, color: locked ? '#a8695a' : 'var(--blue-sh)' }}>
                      {locked ? (c.minTH ? `AYTO NV ${c.minTH}` : 'LOGRO') : `${c.cost} · ${n}/${c.max}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {mode.kind === 'place' && (
          <>
            <div className="lcd" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 22 }}>COLOCA: {CATALOG[mode.type].name.toUpperCase()}</div>
              <div style={{ fontSize: 18, color: placeOk ? 'var(--mint)' : 'var(--coral)' }}>{placeOk ? 'TOCA OTRA CASILLA PARA MOVERLO' : 'CHOCA CON OTRO EDIFICIO O SE SALE'}</div>
            </div>
            <div className="row" style={{ justifyContent: 'center', gap: 14 }}>
              {(
                [
                  ['↖', -1, 0],
                  ['↗', 0, -1],
                  ['↙', 0, 1],
                  ['↘', 1, 0],
                ] as const
              ).map(([label, di, dj]) => (
                <button
                  key={label}
                  className="btn ghost"
                  aria-label={`Mover ${label}`}
                  style={{ width: 52, padding: 0, fontSize: 22 }}
                  onClick={() => {
                    const n = size(mode.type);
                    setMode({ ...mode, i: Math.max(0, Math.min(GRID - n, mode.i + di)), j: Math.max(0, Math.min(GRID - n, mode.j + dj)) });
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="px" style={{ padding: '12px 14px', fontSize: 14, lineHeight: 1.4 }}>
              {CATALOG[mode.type].desc}
            </div>
            <div className="grid2" style={{ gap: 16 }}>
              <button className="btn ghost" onClick={() => setMode({ kind: 'view' })}>
                Cancelar
              </button>
              <button className="btn gold" disabled={!placeOk} onClick={confirmPlace}>
                {mode.moveId ? 'Colocar aquí' : `Colocar · ${CATALOG[mode.type].cost}`}
              </button>
            </div>
          </>
        )}

        {sel && (
          <>
            <div className="px row" style={{ padding: 14, gap: 14 }}>
              <img src={spriteFor(sel.type, sel.level).src} alt="" style={{ height: 64, width: 'auto' }} />
              <div className="grow">
                <h2 style={{ fontSize: 18 }}>{CATALOG[sel.type].name}</h2>
                <div className="vt" style={{ color: 'var(--blue-sh)', fontSize: 18 }}>
                  NIVEL {sel.level}/{maxLevel(sel.type, th)}
                  {(sel.upgradeUntil ?? 0) > now ? ` · EN OBRAS, ${formatWait(sel.upgradeUntil! - now)}` : ''}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.35, color: 'var(--ink-soft)' }}>{CATALOG[sel.type].desc}</div>
              </div>
            </div>
            {(sel.type === 'arbol' || sel.type === 'roca') && (
              <div className="lcd row" style={{ padding: 14, fontSize: 19 }}>
                <span className="grow">QUITARLO DEJA SITIO · A VECES ESCONDE UN CRISTAL</span>
                <button
                  className="btn gold"
                  disabled={state.wallet.coins < REMOVE_COST}
                  style={{ minHeight: 40, padding: '6px 12px' }}
                  onClick={() => {
                    const luck = Math.random();
                    const now2 = Date.now();
                    const r = removeObstacle(state, sel.id, luck, now2);
                    update((s) => removeObstacle(s, sel.id, luck, now2).state);
                    setNote(r.gem ? '¡Había un cristal escondido!' : `${CATALOG[sel.type].name} quitado.`);
                    setMode({ kind: 'view' });
                  }}
                >
                  Quitar · {REMOVE_COST}
                </button>
              </div>
            )}
            {sel.type === 'mina' && (
              <div className="lcd row" style={{ padding: 14, fontSize: 19 }}>
                <img src="img/sprites/s-moneda.svg" alt="" width={26} height={26} />
                <span className="grow">
                  {mineAvailable(sel, now)}/{mineCap(sel.level)} · {studiedToday ? 'LISTA' : 'ESTUDIA HOY PARA VACIARLA'}
                </span>
                <button className="btn gold" disabled={!studiedToday || mineAvailable(sel, now) === 0} style={{ minHeight: 40, padding: '6px 12px' }} onClick={() => update((s) => collect(s, sel.id, Date.now()).state)}>
                  Recoger
                </button>
              </div>
            )}
            {sel.type === 'laboratorio' && (
              <div className="lcd row" style={{ padding: 14, fontSize: 19 }}>
                <img src="img/sprites/s-cristal.svg" alt="" width={26} height={26} />
                <span className="grow">TROPAS NIVEL {v.labLevel} · +{(v.labLevel - 1) * 15}% DAÑO</span>
                {labUpgradeCost(v.labLevel) !== null && (
                  <button className="btn" disabled={state.wallet.gems < labUpgradeCost(v.labLevel)!} style={{ minHeight: 40, padding: '6px 12px' }} onClick={() => update(upgradeLab)}>
                    Mejorar · {labUpgradeCost(v.labLevel)}
                  </button>
                )}
              </div>
            )}
            {CATALOG[sel.type].defense && (
              <div className="lcd" style={{ padding: 14 }}>
                <label className="lbl" htmlFor="feed">
                  ESTUDIO QUE LA ALIMENTA
                </label>
                <select id="feed" className="field" value={sel.studyId ?? ''} onChange={(e) => update((s) => linkDefense(s, sel.id, e.target.value || undefined))}>
                  <option value="">Ninguno</option>
                  {state.studies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {studyMemory(state, s.id, now) ?? 0}%
                    </option>
                  ))}
                </select>
              </div>
            )}
            {(() => {
              const err = canUpgrade(v.buildings, state.wallet.coins, sel.id, now);
              const upgradable = maxLevel(sel.type, th) > 1;
              return upgradable && err !== 'busy' ? (
                <div className="vt" style={{ fontSize: 18, color: err ? 'var(--coral)' : 'var(--dim)' }}>
                  {err ? UPGRADE_MSG[err] : `MEJORAR A NIVEL ${sel.level + 1}: ${upgradeCost(sel.type, sel.level)} MONEDAS · ${upgradeMinutes(sel.type, sel.level)} MIN (CADA SESIÓN DE ESTUDIO −30 MIN)`}
                </div>
              ) : null;
            })()}
            <div className="grid3" style={{ gap: 14 }}>
              <button className="btn ghost" onClick={() => setMode({ kind: 'view' })}>
                Cerrar
              </button>
              <button className="btn" onClick={() => setMode({ kind: 'place', type: sel.type, i: sel.i, j: sel.j, moveId: sel.id })}>
                Mover
              </button>
              <button className="btn gold" disabled={canUpgrade(v.buildings, state.wallet.coins, sel.id, now) !== null} onClick={() => update((s) => upgradeBuilding(s, sel.id, Date.now()))}>
                Mejorar
              </button>
            </div>
          </>
        )}
      </div>
      <Nav active="aldea" />
    </main>
  );
}
