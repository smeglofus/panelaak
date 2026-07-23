// Index card shown when a flat is clicked: tenant identity, happiness, rent
// contribution and one line of flavor (spec §6.3 acceptance).

import type { Flat } from '../game/types';
import { ARCHETYPE_EMOJI, CS } from '../game/content.cs';
import { ARCHETYPES } from '../game/tenants';
import { regimeFell } from '../game/calendar';
import {
  EVICTION_COST,
  FLAT_RENO_MAX,
  flatRenoCost,
  flatRentPerSec,
  formatKcs,
  formatKcsPerSec,
  PROBLEM_DEFS,
  SPY_ENERGY_COST,
} from '../game/economy';
import { happinessFactors } from '../game/tick';
import { useGame } from '../game/store';
import { tenantImage } from '../tenantImages';

interface Props {
  flat: Flat;
  onClose: () => void;
}

export default function TenantCard({ flat, onClose }: Props) {
  const game = useGame((s) => s.game);
  const money = game.money;
  const repairProblem = useGame((s) => s.repairProblem);
  const requestEviction = useGame((s) => s.requestEviction);
  const renovateFlat = useGame((s) => s.renovateFlat);
  const spyOnFlat = useGame((s) => s.spyOnFlat);
  const coverFlat = useGame((s) => s.coverFlat);
  const reportFlat = useGame((s) => s.reportFlat);
  const t = flat.tenant;
  const fell = regimeFell(game.tick);

  const renoButton =
    flat.renovation >= FLAT_RENO_MAX ? (
      <p className="brigade-hint">{CS.reno.max}</p>
    ) : (
      <button
        type="button"
        className="btn btn-reno"
        disabled={money < flatRenoCost(flat.renovation)}
        onClick={() => renovateFlat(flat.index)}
      >
        🛠 {CS.reno.button(flat.renovation + 1, formatKcs(flatRenoCost(flat.renovation)))}
      </button>
    );
  const factors = t ? happinessFactors(game, flat) : [];
  const portrait = t ? tenantImage(t.archetype) : undefined;
  const evictionRunning = t?.evictionAt != null;
  const tier = !t ? 'meh' : t.happiness >= 66 ? 'happy' : t.happiness >= 33 ? 'meh' : 'sad';

  return (
    <div className="tenant-card">
      <button type="button" className="card-close" onClick={onClose} aria-label={CS.ui.close}>
        ×
      </button>
      {t ? (
        <>
          <div className="card-head">
            {portrait ? (
              <img className="card-portrait" src={portrait} alt="" />
            ) : (
              <span className="card-emoji">{ARCHETYPE_EMOJI[t.archetype]}</span>
            )}
            <div>
              <strong>{t.name}</strong>
              <span className="card-archetype">
                {CS.archetypes[t.archetype].label} · {CS.ui.flatLabel(flat.index + 1)} ·{' '}
                {CS.ui.floorLabel(flat.floor)} ·{' '}
                {CS.sites[game.buildings[flat.bldg].site].name}
              </span>
            </div>
          </div>
          <div className="card-row">
            <span>{CS.ui.happiness}</span>
            <div className="bar">
              <div className={`bar-fill bar-${tier}`} style={{ width: `${t.happiness}%` }} />
            </div>
            <span className="card-num">{Math.round(t.happiness)} %</span>
          </div>
          <div className="card-row">
            <span>{CS.ui.rent}</span>
            <span className="card-num">{formatKcsPerSec(flatRentPerSec(game, flat))}</span>
          </div>
          <div className="card-quirk">{ARCHETYPES[t.archetype].quirk}</div>
          {factors.length > 0 && (
            <div className="card-factors">
              <span className="factors-title">{CS.ui.influences}</span>
              <ul>
                {factors.map((f) => (
                  <li key={f.label} className={f.delta >= 0 ? 'factor-good' : 'factor-bad'}>
                    {f.delta >= 0 ? '+' : '−'}
                    {Math.abs(f.delta)} {f.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="card-flavor">{t.flavor}</p>
          {t.secretKnown && t.secret ? (
            <div className="card-secret">
              <span className="factors-title">📎 {CS.ui.secretTitle}</span>
              <p className="secret-label">
                {CS.secrets[t.secret].label}
                {t.confided && <span className="secret-note"> · {CS.ui.secretConfided}</span>}
              </p>
              {t.arrestAt !== null ? (
                <p className="brigade-hint">{CS.ui.reportPending}</p>
              ) : t.covered ? (
                <p className="brigade-hint">{CS.ui.covering}</p>
              ) : (
                !fell && (
                  <div className="secret-actions">
                    <button
                      type="button"
                      className="btn btn-small"
                      onClick={() => coverFlat(flat.index)}
                    >
                      🤫 {CS.ui.cover}
                    </button>
                    <button
                      type="button"
                      className="btn-evict"
                      onClick={() => reportFlat(flat.index)}
                    >
                      🚔 {CS.ui.report}
                    </button>
                  </div>
                )
              )}
            </div>
          ) : (
            !fell &&
            !t.secretKnown && (
              <button
                type="button"
                className="btn btn-small btn-spy"
                disabled={game.energy < SPY_ENERGY_COST}
                title={CS.ui.spyHint}
                onClick={() => spyOnFlat(flat.index)}
              >
                🔍 {CS.ui.spy(SPY_ENERGY_COST)}
              </button>
            )
          )}
          {flat.problem && (
            <button
              type="button"
              className="btn btn-repair"
              disabled={money < PROBLEM_DEFS[flat.problem].repairCost}
              onClick={() => repairProblem(flat.index)}
            >
              {flat.problem === 'leak' ? '💧' : flat.problem === 'window' ? '⚽' : '🥶'}{' '}
              {CS.problems[flat.problem].repair} · {formatKcs(PROBLEM_DEFS[flat.problem].repairCost)}
            </button>
          )}
          {renoButton}
          {evictionRunning ? (
            <p className="eviction-pending">
              {CS.ui.evictionPending(Math.max(0, t.evictionAt! - game.tick))}
            </p>
          ) : (
            <button
              type="button"
              className="btn-evict"
              disabled={t.archetype !== 'pensioner' && money < EVICTION_COST}
              onClick={() => requestEviction(flat.index)}
            >
              {CS.ui.evict} · {formatKcs(EVICTION_COST)}
            </button>
          )}
        </>
      ) : (
        <>
          <div className="card-head">
            <span className="card-emoji">🪟</span>
            <div>
              <strong>{CS.ui.vacantFlat}</strong>
              <span className="card-archetype">
                {CS.ui.flatLabel(flat.index + 1)} · {CS.ui.floorLabel(flat.floor)}
              </span>
            </div>
          </div>
          <p className="card-flavor">{CS.ui.vacantHint}</p>
          {renoButton}
        </>
      )}
    </div>
  );
}
