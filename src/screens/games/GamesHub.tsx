import { useApp } from '../../data/store';
import { setAlphabet, studyCards } from '../../data/actions';
import { ALPHABETS, alphabetById, guessAlphabet } from '../../logic/alphabets';
import { anagramCards } from '../../logic/games';
import { Header, icon } from '../../components/ui';
import { Missing } from '../StudyView';

export default function GamesHub({ id }: { id: string }) {
  const { state, update } = useApp();
  const study = state.studies.find((s) => s.id === id);
  if (!study) return <Missing />;
  const cards = studyCards(state, id);
  const n = cards.length;
  const alpha = alphabetById(study.alphabet) ?? guessAlphabet(`${study.name} ${study.course?.topic ?? ''}`);
  const games = [
    { href: 'mixto', name: 'Modo mixto', desc: '10 rondas al azar de todos los juegos', img: icon('ai'), need: 4, star: true },
    { href: 'contrarreloj', name: 'Contrarreloj', desc: 'Elige la definición en 10 s', img: icon('timer'), need: 4 },
    { href: 'parejas', name: 'Parejas', desc: 'Une cada término con lo suyo', img: icon('cards'), need: 3 },
    { href: 'escribe', name: 'Escribe', desc: 'Lee la definición y escribe el término', img: icon('text'), need: 1 },
    { href: 'vof', name: 'Verdadero o falso', desc: '30 segundos, todas las que puedas', img: icon('check'), need: 2 },
    { href: 'ordena', name: 'Ordena las letras', desc: 'Forma el término con sus letras', img: icon('link'), need: Math.max(1, n - anagramCards(cards).length + 1) },
    { href: 'explica', name: 'Explícalo tú', desc: 'Escribe y la IA te corrige', img: icon('ai'), need: 1 },
  ];

  return (
    <main className="screen">
      <Header back={`#/estudio/${id}`} title="Minijuegos" />
      <p className="muted" style={{ margin: 0 }}>
        Con las {n} tarjetas de «{study.name}». Cada partida da monedas y cuenta para tus misiones.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {games.map((g) => {
          const ok = g.href === 'ordena' ? anagramCards(cards).length > 0 : n >= g.need;
          return (
            <a key={g.href} href={ok ? `#/estudio/${id}/${g.href}` : undefined} aria-disabled={!ok} className={g.star ? 'lcd row' : 'px row'} style={{ textDecoration: 'none', padding: '12px 14px', gap: 14, opacity: ok ? 1 : 0.5 }}>
              <img src={g.img} alt="" width={40} height={40} />
              <span className="grow">
                <span style={{ display: 'block', fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 17, color: g.star ? 'var(--gold)' : undefined }}>{g.name}</span>
                <span style={{ fontSize: 13.5, fontFamily: 'var(--f-body)', color: g.star ? 'var(--text-soft)' : 'var(--ink-soft)' }}>{ok ? g.desc : `Necesita al menos ${g.need} tarjetas`}</span>
              </span>
            </a>
          );
        })}
      </div>

      <section className="lcd" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="row" style={{ fontSize: 20 }}>
          <span className="grow">&gt; DIBUJAR LETRAS</span>
          {alpha && (
            <a className="btn gold" href={`#/estudio/${id}/dibujar`} style={{ minHeight: 40, padding: '6px 14px' }}>
              Jugar
            </a>
          )}
        </div>
        <div style={{ fontFamily: 'var(--f-body)', fontSize: 14, color: 'var(--text-soft)' }}>Si estudias un idioma con otro alfabeto, aprende a escribir sus letras dibujándolas con el dedo.</div>
        <label className="row" style={{ fontSize: 18, color: 'var(--dim)', gap: 10 }}>
          ALFABETO
          <select className="field" style={{ padding: '6px 10px', fontSize: 14, flex: 1 }} value={alpha?.id ?? ''} onChange={(e) => update((s) => setAlphabet(s, id, e.target.value || undefined))}>
            <option value="">Ninguno</option>
            {ALPHABETS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.language})
              </option>
            ))}
          </select>
        </label>
      </section>
    </main>
  );
}
