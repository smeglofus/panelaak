import { useEffect, useState } from 'react';
import { useGame } from './game/store';
import { CS } from './game/content.cs';
import Building from './components/Building';
import SidePanel from './components/SidePanel';
import EventToast from './components/EventToast';
import OfflineModal from './components/OfflineModal';
import ChoiceModal from './components/ChoiceModal';
import TenantCard from './components/TenantCard';

export default function App() {
  const game = useGame((s) => s.game);
  const offlineSummary = useGame((s) => s.offlineSummary);
  const [selectedFlat, setSelectedFlat] = useState<number | null>(null);

  // The single 1000 ms game loop (spec §4). The store skips ticks while a
  // modal (choice / offline summary) is open.
  useEffect(() => {
    const id = setInterval(() => useGame.getState().tickOnce(), 1000);
    return () => clearInterval(id);
  }, []);

  const flat =
    selectedFlat !== null
      ? game.buildings[0].flats.find((f) => f.index === selectedFlat)
      : undefined;

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>{CS.title}</h1>
          <p>{CS.subtitle}</p>
        </div>
        {game.milestones.vzornyDum && <div className="header-badge">★ {CS.ui.plaque}</div>}
      </header>
      <main className="layout">
        <section className="scene">
          <div className="scene-sky">
            <Building
              game={game}
              selected={selectedFlat}
              onSelectFlat={(i) => setSelectedFlat((cur) => (cur === i ? null : i))}
            />
          </div>
          <div className="scene-ground" />
          {flat && <TenantCard flat={flat} onClose={() => setSelectedFlat(null)} />}
        </section>
        <SidePanel />
      </main>
      <EventToast log={game.log} />
      {game.pendingChoice && <ChoiceModal choice={game.pendingChoice} />}
      {offlineSummary && <OfflineModal summary={offlineSummary} />}
    </div>
  );
}
