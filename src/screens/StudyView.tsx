import { useApp } from '../data/store';
import { deleteStudy, setExamDate, studyCards, studyExams, studyMemory } from '../data/actions';
import { daysUntil, formatScore } from '../logic/exam';
import { sessionQueue } from '../logic/srs';
import { go } from '../router';
import { folderIcon, Header, icon, Nav } from '../components/ui';

export default function StudyView({ id }: { id: string }) {
  const { state, update } = useApp();
  const study = state.studies.find((s) => s.id === id);
  if (!study) return <Missing />;
  const now = Date.now();
  const cards = studyCards(state, id);
  const queue = sessionQueue(cards, now);
  const m = studyMemory(state, id, now);
  const sources = state.sources.filter((s) => s.studyId === id);
  const enough = cards.length >= 4;
  const last = studyExams(state, id)[0];
  const left = study.examDate ? daysUntil(study.examDate, now) : null;

  return (
    <main className="screen">
      <Header back="#/estudios" title={study.name}>
        <img src={folderIcon(study.color)} alt="" width={36} height={36} />
      </Header>

      {queue.length > 0 ? (
        <a href={`#/estudio/${id}/repaso`} className="lcd row" style={{ textDecoration: 'none', padding: '16px 18px', gap: 14 }}>
          <div className="grow">
            <div style={{ fontSize: 18, color: 'var(--dim)' }}>&gt; HOY TOCA</div>
            <div style={{ fontSize: 25, lineHeight: 1.05 }}>{queue.length} TARJETAS</div>
            <div style={{ fontSize: 18, color: 'var(--dim)' }}>MEMORIA {m ?? 0}%</div>
          </div>
          <span className="btn" aria-hidden="true">
            Empezar
          </span>
        </a>
      ) : (
        <div className="lcd" style={{ padding: '16px 18px', fontSize: 20 }}>
          {cards.length === 0 ? '> AÑADE APUNTES PARA CREAR TARJETAS' : `> AL DÍA · MEMORIA ${m ?? 0}%`}
        </div>
      )}

      <section className="lcd" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <img src={icon('timer')} alt="" width={36} height={36} />
          <div className="grow" style={{ fontSize: 19, lineHeight: 1.15 }}>
            <div style={{ color: 'var(--dim)' }}>&gt; EXAMEN</div>
            <div>
              {left === null ? 'SIN FECHA' : left > 0 ? `EN ${left} ${left === 1 ? 'DÍA' : 'DÍAS'}` : left === 0 ? 'ES HOY' : 'YA PASÓ'}
              {last ? ` · ÚLTIMA NOTA ${formatScore(last.score)}` : ''}
            </div>
          </div>
          <a className="btn gold" href={cards.length ? `#/estudio/${id}/examen` : undefined} aria-disabled={!cards.length} style={{ opacity: cards.length ? 1 : 0.5, minHeight: 44, padding: '8px 14px' }}>
            Hacer examen
          </a>
        </div>
        <label className="row" style={{ fontSize: 17, color: 'var(--dim)', gap: 10 }}>
          FECHA
          <input type="date" className="field" style={{ padding: '6px 10px', fontSize: 14, flex: 1 }} value={study.examDate ?? ''} onChange={(e) => update((s) => setExamDate(s, id, e.target.value || undefined))} />
        </label>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2>Estudiar</h2>
        <div className="grid2">
          <a href={`#/estudio/${id}/repaso`} className="px tile" style={{ minHeight: 120 }}>
            <img src={icon('cards')} alt="" style={{ width: 48, height: 48 }} />
            Flashcards
          </a>
          <a href={`#/estudio/${id}/resumen`} className="px tile" style={{ minHeight: 120 }}>
            <img src={icon('doc')} alt="" style={{ width: 48, height: 48 }} />
            Resumen
          </a>
          <a href={enough ? `#/estudio/${id}/contrarreloj` : undefined} aria-disabled={!enough} className="px tile" style={{ minHeight: 120, opacity: enough ? 1 : 0.5 }}>
            <img src={icon('timer')} alt="" style={{ width: 48, height: 48 }} />
            Contrarreloj
          </a>
          <a href={cards.length ? `#/estudio/${id}/explica` : undefined} aria-disabled={!cards.length} className="px tile" style={{ minHeight: 120, opacity: cards.length ? 1 : 0.5 }}>
            <img src={icon('ai')} alt="" style={{ width: 48, height: 48 }} />
            Explícalo tú
          </a>
        </div>
        {!enough && cards.length > 0 && <p className="muted" style={{ margin: 0 }}>El Contrarreloj necesita al menos 4 tarjetas.</p>}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2>Fuentes</h2>
        <div className="row" style={{ flexWrap: 'wrap', gap: 14 }}>
          {sources.map((s) => (
            <span key={s.id} className="lcd row" style={{ gap: 8, padding: '8px 10px', fontSize: 17 }}>
              <img src={icon(s.kind === 'pdf' ? 'pdf' : s.kind === 'image' ? 'photo' : 'text')} alt="" width={22} height={22} />
              {s.name.toUpperCase().slice(0, 22)}
            </span>
          ))}
          <a href={`#/estudio/${id}/anadir`} style={{ fontWeight: 600 }}>
            + Añadir
          </a>
        </div>
      </section>

      <button
        className="btn ghost"
        style={{ alignSelf: 'flex-start', fontSize: 14, minHeight: 40 }}
        onClick={() => {
          if (confirm(`¿Borrar «${study.name}» con sus tarjetas? No se puede deshacer.`)) {
            update((s) => deleteStudy(s, id));
            go('/estudios');
          }
        }}
      >
        Borrar estudio
      </button>
      <Nav active="estudios" />
    </main>
  );
}

export function Missing() {
  return (
    <main className="screen">
      <Header back="#/estudios" title="No encontrado" />
      <p className="muted">Este estudio ya no existe.</p>
    </main>
  );
}

export function SummaryView({ id }: { id: string }) {
  const { state } = useApp();
  const study = state.studies.find((s) => s.id === id);
  if (!study) return <Missing />;
  return (
    <main className="screen">
      <Header back={`#/estudio/${id}`} title="Resumen" />
      {study.summary ? (
        <article className="px" style={{ padding: 20, fontSize: 16, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {study.summary}
        </article>
      ) : (
        <p className="muted">Aún no hay resumen. Se crea al generar el material con la IA desde «Añadir».</p>
      )}
    </main>
  );
}
