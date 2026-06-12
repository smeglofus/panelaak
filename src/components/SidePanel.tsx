// The "domovní správa" notice board: money, stats, contextual repairs,
// upgrades, milestones, new game.

import type { MilestoneId, UpgradeId } from '../game/types';
import { CS } from '../game/content.cs';
import { useGame } from '../game/store';
import { avgHappiness, occupiedCount } from '../game/state';
import {
  elevatorRepairCost,
  formatKcs,
  formatKcsPerSec,
  incomePerSec,
  LEAK_REPAIR_COST,
  UPGRADE_COSTS,
} from '../game/economy';

export default function SidePanel() {
  const game = useGame((s) => s.game);
  const buyUpgrade = useGame((s) => s.buyUpgrade);
  const repairElevator = useGame((s) => s.repairElevator);
  const repairLeak = useGame((s) => s.repairLeak);
  const newGame = useGame((s) => s.newGame);

  const b = game.buildings[0];
  const leaks = b.flats.filter((f) => f.problem === 'leak');
  const elevCost = elevatorRepairCost(b.floors);

  return (
    <aside className="panel">
      <div className="panel-header">DOMOVNÍ SPRÁVA</div>

      <div className="money-box">
        <div className="money">{formatKcs(game.money)}</div>
        <div className="income">+{formatKcsPerSec(incomePerSec(game))}</div>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <span className="stat-label">{CS.ui.reputation}</span>
          <span className="stat-value">{Math.round(game.reputation)} %</span>
        </div>
        <div className="stat">
          <span className="stat-label">{CS.ui.avgHappiness}</span>
          <span className="stat-value">{Math.round(avgHappiness(game))} %</span>
        </div>
        <div className="stat">
          <span className="stat-label">{CS.ui.occupancy}</span>
          <span className="stat-value">{CS.ui.flatsCount(occupiedCount(game), b.flats.length)}</span>
        </div>
      </div>

      {(b.elevatorBroken || leaks.length > 0) && (
        <section className="panel-section panel-alert">
          <h3>{CS.ui.repairs}</h3>
          {b.elevatorBroken && (
            <button
              type="button"
              className="btn btn-repair"
              disabled={game.money < elevCost}
              onClick={repairElevator}
            >
              ⚠️ {CS.ui.repairElevator} · {formatKcs(elevCost)}
            </button>
          )}
          {leaks.map((f) => (
            <button
              type="button"
              key={f.index}
              className="btn btn-repair"
              disabled={game.money < LEAK_REPAIR_COST}
              onClick={() => repairLeak(f.index)}
            >
              {CS.ui.leakInFlat(CS.ui.flatLabel(f.index + 1))} · {formatKcs(LEAK_REPAIR_COST)}
            </button>
          ))}
        </section>
      )}

      <section className="panel-section">
        <h3>{CS.ui.upgrades}</h3>
        {(Object.keys(UPGRADE_COSTS) as UpgradeId[]).map((id) => {
          const owned = game.upgrades[id];
          const cost = UPGRADE_COSTS[id];
          return (
            <div key={id} className={`upgrade${owned ? ' upgrade-owned' : ''}`}>
              <div className="upgrade-text">
                <strong>{CS.upgrades[id].name}</strong>
                <span>{CS.upgrades[id].desc}</span>
              </div>
              {owned ? (
                <span className="owned-mark">{CS.ui.owned}</span>
              ) : (
                <button
                  type="button"
                  className="btn"
                  disabled={game.money < cost}
                  onClick={() => buyUpgrade(id)}
                >
                  {formatKcs(cost)}
                </button>
              )}
            </div>
          );
        })}
      </section>

      <section className="panel-section">
        <h3>{CS.ui.milestones}</h3>
        <ul className="milestones">
          {(Object.keys(CS.milestones) as MilestoneId[]).map((id) => (
            <li key={id} className={game.milestones[id] ? 'done' : ''}>
              {game.milestones[id] ? '☑' : '☐'} {CS.milestones[id].label}
            </li>
          ))}
        </ul>
      </section>

      <button
        type="button"
        className="btn-newgame"
        onClick={() => {
          if (window.confirm(CS.ui.newGameConfirm)) newGame();
        }}
      >
        {CS.ui.newGame}
      </button>
    </aside>
  );
}
