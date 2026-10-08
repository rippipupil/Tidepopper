import { useEffect } from 'react';
import { useApp } from './data/store';
import { daily } from './data/actions';
import { useRoute } from './router';
import Home from './screens/Home';
import Studies from './screens/Studies';
import StudyView, { SummaryView } from './screens/StudyView';
import AddSources from './screens/AddSources';
import Review from './screens/Review';
import RewardView from './screens/RewardView';
import TimeAttack from './screens/TimeAttack';
import Explain from './screens/Explain';
import VillageView from './screens/VillageView';
import Attack from './screens/Attack';
import Settings from './screens/Settings';
import Exam from './screens/Exam';
import CourseNew from './screens/CourseNew';
import CourseView from './screens/CourseView';
import LevelView from './screens/LevelView';
import Chat from './screens/Chat';
import RaidReport from './screens/RaidReport';

export default function App() {
  const { ready, update } = useApp();
  const { path, query } = useRoute();
  // Al abrir y cada minuto: terminan las obras y, si es un día nuevo con grietas, ataca la Niebla.
  useEffect(() => {
    if (!ready) return;
    update((s) => daily(s, Date.now()));
    const t = window.setInterval(() => update((s) => daily(s, Date.now())), 60_000);
    return () => window.clearInterval(t);
  }, [ready, update]);
  if (!ready)
    return (
      <main className="screen">
        <div className="lcd" style={{ padding: 18, fontSize: 22 }}>
          &gt; CARGANDO…
        </div>
      </main>
    );

  const [a, id, sub, n] = path;
  if (a === 'curso') {
    if (id === 'nuevo' || !id) return <CourseNew />;
    if (sub === 'nivel') return <LevelView key={`${id}-${n}`} id={id} index={Number(n)} />;
    return <CourseView id={id} />;
  }
  if (a === 'asalto') return <RaidReport />;
  if (a === 'estudios') return <Studies startNew={query.get('nuevo') === '1'} />;
  if (a === 'estudio' && id) {
    if (sub === 'anadir') return <AddSources id={id} />;
    if (sub === 'repaso') return <Review key={id} id={id} />;
    if (sub === 'resumen') return <SummaryView id={id} />;
    if (sub === 'contrarreloj') return <TimeAttack id={id} />;
    if (sub === 'explica') return <Explain id={id} />;
    if (sub === 'examen') return <Exam key={id} id={id} />;
    if (sub === 'chat') return <Chat key={id} id={id} initial={query.get('q') ?? ''} />;
    return <StudyView id={id} />;
  }
  if (a === 'recompensa') return <RewardView q={query} />;
  if (a === 'aldea') return <VillageView />;
  if (a === 'ataque') return <Attack />;
  if (a === 'ajustes') return <Settings />;
  return <Home />;
}
