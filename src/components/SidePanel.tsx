// The "domovní správa" notice board. The live core (fund, brigáda, plán,
// repairs, caretaker) stays pinned at the top; shops and meta live behind tabs
// so the panel stops being one endless scroll.

import { useRef, useState, type ReactNode } from 'react';
import type { BadgeId, CourtyardId, MilestoneId, PerkId, ProjectId, RepeatableId, TuzexId, UpgradeId } from '../game/types';
import { CS } from '../game/content.cs';
import { useGame } from '../game/store';
import { allFlats, avgHappiness, occupiedCount, totalFloors } from '../game/state';
import { dateFromTick, formatDateCs, isWinter, regimeFell, seasonEmoji } from '../game/calendar';
import { computeKupony, privatizaceAvailable, privatizaceRumoured } from '../game/prestige';
import { describePlan, planProgress } from '../game/plans';
import { SECONDS_PER_DAY } from '../game/calendar';
import { play } from '../sound';
import { encodeSave } from '../game/state';
import { downloadSave, readSaveFile } from '../saveFile';
import LeaderboardPanel from './LeaderboardPanel';
import {
  BRIGADE_ENERGY_COST,
  brigadeReward,
  formatDuration,
  CARETAKER_MIN_FLOORS,
  CARETAKER_WAGE_PER_SEC,
  COURTYARD_COSTS,
  elevatorRepairCost,
  formatKcs,
  formatKcsPerSec,
  HEATING_COST_PER_FLOOR,
  incomePerSec,
  KAVA_COST_BONY,
  MAX_BUILDINGS,
  MAX_FLOORS,
  PERK_COSTS,
  PERK_MAX,
  PROBLEM_DEFS,
  PLOT_COSTS,
  PROJECT_COSTS,
  PROJECT_ORDER,
  repeatableCost,
  TUZEX_COSTS,
  UPGRADE_COSTS,
} from '../game/economy';

type Tab = 'dum' | 'obchod' | 'kariera' | 'zaznamy' | 'data';

const TAB_ORDER: Tab[] = ['dum', 'obchod', 'kariera', 'zaznamy', 'data'];

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
  const buyPlot = useGame((s) => s.buyPlot);
  const buyProject = useGame((s) => s.buyProject);
  const hireCaretaker = useGame((s) => s.hireCaretaker);
  const fireCaretaker = useGame((s) => s.fireCaretaker);
  const importSave = useGame((s) => s.importSave);
  const newGame = useGame((s) => s.newGame);

  const [tab, setTab] = useState<Tab>('dum');
  const fileInput = useRef<HTMLInputElement>(null);

  const records = game.meta.records;
  const anyRecord =
    records.fastestVzornyTicks !== null ||
    records.richestEraEarned > 0 ||
    records.kuponyEarnedTotal > 0;

  const handleExport = () => {
    const blob = encodeSave(game);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(blob)
        .then(() => window.alert(CS.save.exportDone))
        .catch(() => window.prompt(CS.save.exportPrompt, blob));
    } else {
      window.prompt(CS.save.exportPrompt, blob);
    }
  };

  const handleImport = () => {
    const raw = window.prompt(CS.save.importPrompt);
    if (!raw) return;
    window.alert(importSave(raw) ? CS.save.importDone : CS.save.importFail);
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    const raw = await readSaveFile(file);
    window.alert(importSave(raw) ? CS.save.importDone : CS.save.importFail);
  };

  const problems = allFlats(game).filter((f) => f.problem);
  const brokenElevators = game.buildings
    .map((bb, i) => ({ building: bb, i }))
    .filter(({ building }) => building.elevatorBroken);
  const anythingBroken = brokenElevators.length > 0 || problems.length > 0;
  const date = dateFromTick(game.tick);
  const winter = isWinter(date);
  const fell = regimeFell(game.tick);

  // --- Tab: Dům (build & upgrade) -------------------------------------------
  const dumTab = (
    <>
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
        <h3>{CS.projects.title}</h3>
        {PROJECT_ORDER.map((id: ProjectId, i) => {
          const owned = game.projects[id];
          const locked = i > 0 && !game.projects[PROJECT_ORDER[i - 1]];
          const cost = PROJECT_COSTS[id];
          return (
            <div key={id} className={`upgrade${owned ? ' upgrade-owned' : ''}`}>
              <div className="upgrade-text">
                <strong>{CS.projects[id].name}</strong>
                <span>{locked && !owned ? CS.projects.locked : CS.projects[id].desc}</span>
              </div>
              {owned ? (
                <span className="owned-mark">{CS.ui.owned}</span>
              ) : (
                <button
                  type="button"
                  className="btn"
                  disabled={locked || game.money < cost}
                  onClick={() => buyProject(id)}
                >
                  {formatKcs(cost)}
                </button>
              )}
            </div>
          );
        })}
      </section>

      <section className="panel-section">
        <h3>{CS.sidliste.title}</h3>
        <ul className="sidliste-list">
          {game.buildings.map((bb, i) => (
            <li key={i}>
              🏢 {CS.sites[bb.site].name} — {bb.floors}
              {' '}p., {CS.ui.flatsCount(bb.flats.filter((f) => f.tenant).length, bb.flats.length)}
            </li>
          ))}
        </ul>
        {game.buildings.length < MAX_BUILDINGS &&
          (game.buildings[game.buildings.length - 1].floors >= MAX_FLOORS ? (
            <button
              type="button"
              className="btn btn-brigade"
              disabled={game.money < PLOT_COSTS[game.buildings.length]}
              onClick={buyPlot}
            >
              🏗️{' '}
              {CS.sidliste.buyPlot(
                CS.sites[game.buildings.length].name,
                formatKcs(PLOT_COSTS[game.buildings.length]),
              )}
            </button>
          ) : (
            <p className="brigade-hint">{CS.sidliste.needFullHouse}</p>
          ))}
        {game.buildings.length >= MAX_BUILDINGS && (
          <p className="brigade-hint">{CS.sidliste.complete}</p>
        )}
      </section>
    </>
  );

  // --- Tab: Obchod (Tuzex) --------------------------------------------------
  const obchodTab = (
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
  );

  // --- Tab: Kariéra (privatizace, posudek, síň slávy) -----------------------
  const karieraTab = (
    <>
      <LeaderboardPanel />
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
          game.meta.prestigeLevel === 0 && (
            <p className="prestige-info">
              {privatizaceRumoured(game) ? CS.prestige.rumour : CS.prestige.teaser}
            </p>
          )
        )}
        {(game.meta.prestigeLevel > 0 || game.meta.kupony > 0) && (
          <>
            <p className="prestige-kupony">✂️ {CS.prestige.kupony(game.meta.kupony)}</p>
            <h4 className="perks-title">{CS.prestige.perksTitle}</h4>
            {(Object.keys(CS.perks) as PerkId[]).map((id) => {
              const level = game.meta.perks[id];
              const maxed = level >= PERK_MAX[id];
              return (
                <div key={id} className="upgrade">
                  <div className="upgrade-text">
                    <strong>
                      {CS.perks[id].name}
                      {level > 0 && <span className="level-badge"> {CS.prestige.level(level)}</span>}
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

      <section className="panel-section">
        <h3>{CS.posudek.title}</h3>
        <ul className="milestones">
          {(Object.keys(CS.badges) as BadgeId[]).map((id) => (
            <li key={id} className={game.meta.badges[id] ? 'done' : ''} title={CS.badges[id].desc}>
              {game.meta.badges[id] ? '★' : '☆'} {CS.badges[id].label}
              <span className="badge-desc"> — {CS.badges[id].desc}</span>
            </li>
          ))}
        </ul>
        <p className="brigade-hint">{CS.posudek.hint}</p>
      </section>

      {anyRecord && (
        <section className="panel-section">
          <h3>{CS.sinSlavy.title}</h3>
          <ul className="records">
            <li>
              <span>{CS.sinSlavy.fastestVzorny}</span>
              <strong>
                {records.fastestVzornyTicks !== null
                  ? formatDuration(records.fastestVzornyTicks)
                  : CS.sinSlavy.none}
              </strong>
            </li>
            <li>
              <span>{CS.sinSlavy.richestEra}</span>
              <strong>
                {records.richestEraEarned > 0
                  ? formatKcs(records.richestEraEarned)
                  : CS.sinSlavy.none}
              </strong>
            </li>
            <li>
              <span>{CS.sinSlavy.bestIncome}</span>
              <strong>{formatKcsPerSec(records.bestIncomePerSec)}</strong>
            </li>
            <li>
              <span>{CS.sinSlavy.kuponyTotal}</span>
              <strong>{records.kuponyEarnedTotal}</strong>
            </li>
          </ul>
        </section>
      )}
    </>
  );

  // --- Tab: Záznamy (milníky, kronika) --------------------------------------
  const zaznamyTab = (
    <>
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
              .slice(-12)
              .reverse()
              .map((e) => (
                <li key={e.seq} className={`kronika-${e.kind}`}>
                  {e.text}
                </li>
              ))}
          </ul>
        )}
      </section>
    </>
  );

  // --- Tab: Data (save management) ------------------------------------------
  const dataTab = (
    <section className="panel-section">
      <h3>{CS.save.title}</h3>
      <div className="data-buttons">
        <button type="button" className="btn btn-brigade" onClick={() => downloadSave(game)}>
          {CS.save.download}
        </button>
        <button
          type="button"
          className="btn btn-brigade"
          onClick={() => fileInput.current?.click()}
        >
          {CS.save.upload}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".panelak,.txt,text/plain"
          style={{ display: 'none' }}
          onChange={(e) => {
            void handleUpload(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button type="button" className="btn-newgame" onClick={handleExport}>
          {CS.save.export}
        </button>
        <button type="button" className="btn-newgame" onClick={handleImport}>
          {CS.save.import}
        </button>
        <button
          type="button"
          className="btn-newgame btn-danger"
          onClick={() => {
            if (window.confirm(CS.ui.newGameConfirm)) newGame();
          }}
        >
          {CS.ui.newGame}
        </button>
      </div>
    </section>
  );

  const TAB_CONTENT: Record<Tab, ReactNode> = {
    dum: dumTab,
    obchod: obchodTab,
    kariera: karieraTab,
    zaznamy: zaznamyTab,
    data: dataTab,
  };

  return (
    <aside className="panel">
      <div className="panel-header">{CS.ui.panelHeader}</div>

      <div className="date-row">
        <span>
          {seasonEmoji(date)} {formatDateCs(date)}
        </span>
        {winter && (
          <span className="heating-note">
            {CS.ui.heating(formatKcsPerSec(HEATING_COST_PER_FLOOR * totalFloors(game)))}
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
          <span className="stat-label">🤝 {CS.ui.reputation}</span>
          <span className="stat-value">{Math.round(game.reputation)} %</span>
        </div>
        <div className="stat">
          <span className="stat-label">☭ {fell ? CS.ui.regimeGone : CS.ui.regime}</span>
          <span className="stat-value">{fell ? '—' : `${Math.round(game.regime)} %`}</span>
        </div>
        <div className="stat">
          <span className="stat-label">{CS.ui.avgHappiness}</span>
          <span className="stat-value">{Math.round(avgHappiness(game))} %</span>
        </div>
        <div className="stat">
          <span className="stat-label">{CS.ui.occupancy}</span>
          <span className="stat-value">{CS.ui.flatsCount(occupiedCount(game), allFlats(game).length)}</span>
        </div>
      </div>

      <section className="panel-section">
        <h3>{CS.ui.brigade}</h3>
        <button
          type="button"
          className="btn btn-brigade"
          disabled={game.energy < BRIGADE_ENERGY_COST}
          onClick={() => {
            play('click');
            workBrigade();
          }}
        >
          🔨 {CS.ui.brigadeAction} · +{formatKcs(brigadeReward(totalFloors(game), game.repeatables.naradi, game.meta.perks.rucicky))}
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

      <section className="panel-section panel-plan">
        <h3>{CS.plans.title}</h3>
        {game.plan ? (
          <>
            <p className="plan-task">{describePlan(game.plan)}</p>
            <div className="energy-row">
              <div className="bar">
                <div
                  className="bar-fill bar-plan"
                  style={{
                    width: `${Math.round((planProgress(game, game.plan) / game.plan.target) * 100)}%`,
                  }}
                />
              </div>
              <span className="energy-value">
                {CS.plans.daysLeft(
                  Math.max(0, Math.ceil((game.plan.deadline - game.tick) / SECONDS_PER_DAY)),
                )}
              </span>
            </div>
            <p className="brigade-hint">
              {CS.plans.reward}: {formatKcs(game.plan.rewardKcs)} + ★{game.plan.rewardBony}
              {game.plan.rewardKupon && ` ${CS.plans.kuponBonus}`}
            </p>
          </>
        ) : (
          <p className="brigade-hint">{fell ? CS.plans.dissolved : CS.plans.none}</p>
        )}
      </section>

      {anythingBroken && (
        <section className="panel-section panel-alert">
          <h3>{CS.ui.repairs}</h3>
          {brokenElevators.map(({ building, i }) => (
            <button
              type="button"
              key={`elev-${i}`}
              className="btn btn-repair"
              disabled={game.money < elevatorRepairCost(building.floors)}
              onClick={() => repairElevator(i)}
            >
              ⚠️ {CS.ui.repairElevator} ({CS.sites[building.site].name}) ·{' '}
              {formatKcs(elevatorRepairCost(building.floors))}
            </button>
          ))}
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

      {game.buildings.some((bb) => bb.floors >= CARETAKER_MIN_FLOORS) && (
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

      <nav className="panel-tabs" role="tablist">
        {TAB_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`panel-tab${tab === id ? ' panel-tab-active' : ''}`}
            onClick={() => setTab(id)}
          >
            {CS.ui.tabs[id]}
          </button>
        ))}
      </nav>

      <div className="panel-tab-content">{TAB_CONTENT[tab]}</div>
    </aside>
  );
}
