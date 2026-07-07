// The "domovní správa" notice board: money, stats, contextual repairs,
// upgrades, milestones, new game.

import type { CourtyardId, MilestoneId, PerkId, RepeatableId, TuzexId, UpgradeId } from '../game/types';
import { CS } from '../game/content.cs';
import { useGame } from '../game/store';
import { avgHappiness, occupiedCount } from '../game/state';
import { dateFromTick, formatDateCs, isWinter, seasonEmoji } from '../game/calendar';
import { computeKupony, privatizaceAvailable, privatizaceRumoured } from '../game/prestige';
import {
  BRIGADE_ENERGY_COST,
  brigadeReward,
  CARETAKER_MIN_FLOORS,
  CARETAKER_WAGE_PER_SEC,
  COURTYARD_COSTS,
  elevatorRepairCost,
  formatKcs,
  formatKcsPerSec,
  HEATING_COST_PER_FLOOR,
  incomePerSec,
  KAVA_COST_BONY,
  PERK_COSTS,
  PERK_MAX,
  PROBLEM_DEFS,
  repeatableCost,
  TUZEX_COSTS,
  UPGRADE_COSTS,
} from '../game/economy';

export default function SidePanel() {
  const game = useGame((s) => s.game);
  const buyUpgrade = useGame((s) => s.buyUpgrade);
  const repairElevator = useGame((s) => s.repairElevator);
  const repairProblem = useGame((s) => s.repairProblem);
  const workBrigade = useGame((s) => s.workBrigade);
  const buyCourtyard = useGame((s) => s.buyCourtyard);
  const buyTuzex = useGame((s) => s.buyTuzex);
  const buyKava = useGame((s) => s.buyKava);
  const buyRepeatable = useGame((s) => s.buyRepeatable);
  const buyPrestigePerk = useGame((s) => s.buyPrestigePerk);
  const privatize = useGame((s) => s.privatize);
  const hireCaretaker = useGame((s) => s.hireCaretaker);
  const fireCaretaker = useGame((s) => s.fireCaretaker);
  const newGame = useGame((s) => s.newGame);

  const b = game.buildings[0];
  const problems = b.flats.filter((f) => f.problem);
  const anythingBroken = b.elevatorBroken || problems.length > 0;
  const elevCost = elevatorRepairCost(b.floors);
  const date = dateFromTick(game.tick);
  const winter = isWinter(date);

  return (
    <aside className="panel">
      <div className="panel-header">DOMOVNÍ SPRÁVA</div>

      <div className="date-row">
        <span>
          {seasonEmoji(date)} {formatDateCs(date)}
        </span>
        {winter && (
          <span className="heating-note">
            {CS.ui.heating(formatKcsPerSec(HEATING_COST_PER_FLOOR * b.floors))}
          </span>
        )}
      </div>

      <div className="money-box">
        <div>
          <div className="money">{formatKcs(game.money)}</div>
          <div className="bony-row" title={CS.ui.tuzexHint}>
            ★ {CS.ui.bony(game.bony)}
          </div>
        </div>
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

      <section className="panel-section">
        <h3>{CS.ui.brigade}</h3>
        <button
          type="button"
          className="btn btn-brigade"
          disabled={game.energy < BRIGADE_ENERGY_COST}
          onClick={workBrigade}
        >
          🔨 {CS.ui.brigadeAction} · +{formatKcs(brigadeReward(b.floors))}
        </button>
        <div className="energy-row">
          <span className="energy-label">{CS.ui.energy}</span>
          <div className="bar">
            <div className="bar-fill bar-energy" style={{ width: `${game.energy}%` }} />
          </div>
          <span className="energy-value">{Math.round(game.energy)} %</span>
        </div>
        <p className="brigade-hint">{CS.ui.brigadeHint}</p>
      </section>

      {(b.elevatorBroken || problems.length > 0) && (
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
          {problems.map((f) => (
            <button
              type="button"
              key={f.index}
              className="btn btn-repair"
              disabled={game.money < PROBLEM_DEFS[f.problem!].repairCost}
              onClick={() => repairProblem(f.index)}
            >
              {CS.problems[f.problem!].list(CS.ui.flatLabel(f.index + 1))} ·{' '}
              {formatKcs(PROBLEM_DEFS[f.problem!].repairCost)}
            </button>
          ))}
        </section>
      )}

      {b.floors >= CARETAKER_MIN_FLOORS && (
        <section className="panel-section">
          <h3>{CS.ui.domovnik}</h3>
          {game.caretakerHired ? (
            <div className="caretaker-row">
              <span className="caretaker-status">
                {anythingBroken ? CS.ui.caretakerOnDuty : CS.ui.caretakerIdle}
              </span>
              <button type="button" className="btn btn-small" onClick={fireCaretaker}>
                {CS.ui.fireCaretaker}
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-brigade" onClick={hireCaretaker}>
              🧹 {CS.ui.hireCaretaker(formatKcsPerSec(CARETAKER_WAGE_PER_SEC))}
            </button>
          )}
          <p className="brigade-hint">{CS.ui.caretakerHint}</p>
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
        <h3>{CS.ui.dvorek}</h3>
        {(Object.keys(COURTYARD_COSTS) as CourtyardId[]).map((id) => {
          const owned = game.courtyard[id];
          const cost = COURTYARD_COSTS[id];
          return (
            <div key={id} className={`upgrade${owned ? ' upgrade-owned' : ''}`}>
              <div className="upgrade-text">
                <strong>{CS.courtyard[id].name}</strong>
                <span>{CS.courtyard[id].desc}</span>
              </div>
              {owned ? (
                <span className="owned-mark">{CS.ui.owned}</span>
              ) : (
                <button
                  type="button"
                  className="btn"
                  disabled={game.money < cost}
                  onClick={() => buyCourtyard(id)}
                >
                  {formatKcs(cost)}
                </button>
              )}
            </div>
          );
        })}
      </section>

      <section className="panel-section">
        <h3>{CS.ui.modernizace}</h3>
        {(Object.keys(CS.repeatables) as RepeatableId[]).map((id) => {
          const level = game.repeatables[id];
          const cost = repeatableCost(id, level);
          return (
            <div key={id} className="upgrade">
              <div className="upgrade-text">
                <strong>
                  {CS.repeatables[id].name}
                  {level > 0 && <span className="level-badge"> {CS.prestige.level(level)}</span>}
                </strong>
                <span>{CS.repeatables[id].desc}</span>
              </div>
              <button
                type="button"
                className="btn"
                disabled={game.money < cost}
                onClick={() => buyRepeatable(id)}
              >
                {formatKcs(cost)}
              </button>
            </div>
          );
        })}
      </section>

      <section className="panel-section">
        <h3>{CS.ui.tuzex}</h3>
        {(Object.keys(TUZEX_COSTS) as TuzexId[]).map((id) => {
          const owned = game.tuzex[id];
          const cost = TUZEX_COSTS[id];
          const locked = id === 'pracka' && !game.upgrades.laundry;
          return (
            <div key={id} className={`upgrade${owned ? ' upgrade-owned' : ''}`}>
              <div className="upgrade-text">
                <strong>{CS.tuzex[id].name}</strong>
                <span>{CS.tuzex[id].desc}</span>
              </div>
              {owned ? (
                <span className="owned-mark">{CS.ui.owned}</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-bony"
                  disabled={game.bony < cost || locked}
                  onClick={() => buyTuzex(id)}
                >
                  ★ {cost}
                </button>
              )}
            </div>
          );
        })}
        <div className="upgrade">
          <div className="upgrade-text">
            <strong>{CS.kava.name}</strong>
            <span>{CS.kava.desc}</span>
          </div>
          <button
            type="button"
            className="btn btn-bony"
            disabled={game.bony < KAVA_COST_BONY}
            onClick={buyKava}
          >
            ★ {KAVA_COST_BONY}
          </button>
        </div>
        <p className="brigade-hint">{CS.ui.tuzexHint}</p>
      </section>

      {(privatizaceRumoured(game) || game.meta.prestigeLevel > 0 || game.meta.kupony > 0) && (
        <section className="panel-section panel-prestige">
          <h3>
            {CS.prestige.title}
            {game.meta.prestigeLevel > 0 && ` · ${CS.prestige.era(game.meta.prestigeLevel + 1)}`}
          </h3>
          {privatizaceAvailable(game) ? (
            <>
              <p className="prestige-info">{CS.prestige.available}</p>
              <button
                type="button"
                className="btn btn-prestige"
                onClick={() => {
                  if (window.confirm(CS.prestige.confirm)) privatize();
                }}
              >
                🏛️ {CS.prestige.button} · {CS.prestige.projected(computeKupony(game))}
              </button>
            </>
          ) : (
            game.meta.prestigeLevel === 0 && <p className="prestige-info">{CS.prestige.rumour}</p>
          )}
          {(game.meta.prestigeLevel > 0 || game.meta.kupony > 0) && (
            <>
              <p className="prestige-kupony">
                ✂️ {CS.prestige.kupony(game.meta.kupony)}
              </p>
              <h4 className="perks-title">{CS.prestige.perksTitle}</h4>
              {(Object.keys(CS.perks) as PerkId[]).map((id) => {
                const level = game.meta.perks[id];
                const maxed = level >= PERK_MAX[id];
                return (
                  <div key={id} className="upgrade">
                    <div className="upgrade-text">
                      <strong>
                        {CS.perks[id].name}
                        {level > 0 && (
                          <span className="level-badge"> {CS.prestige.level(level)}</span>
                        )}
                      </strong>
                      <span>{CS.perks[id].desc}</span>
                    </div>
                    {maxed ? (
                      <span className="owned-mark">{CS.prestige.maxed}</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-bony"
                        disabled={game.meta.kupony < PERK_COSTS[id]}
                        onClick={() => buyPrestigePerk(id)}
                      >
                        ✂️ {PERK_COSTS[id]}
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </section>
      )}

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

      <section className="panel-section">
        <h3>{CS.ui.kronika}</h3>
        {game.log.length === 0 ? (
          <p className="kronika-empty">{CS.ui.kronikaEmpty}</p>
        ) : (
          <ul className="kronika">
            {game.log
              .slice(-6)
              .reverse()
              .map((e) => (
                <li key={e.seq} className={`kronika-${e.kind}`}>
                  {e.text}
                </li>
              ))}
          </ul>
        )}
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
