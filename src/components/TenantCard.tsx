// Index card shown when a flat is clicked: tenant identity, happiness, rent
// contribution and one line of flavor (spec §6.3 acceptance).

import type { Flat } from '../game/types';
import { ARCHETYPE_EMOJI, CS } from '../game/content.cs';
import { ARCHETYPES } from '../game/tenants';
import { flatRentPerSec, formatKcs, formatKcsPerSec, PROBLEM_DEFS } from '../game/economy';
import { happinessFactors } from '../game/tick';
import { useGame } from '../game/store';

interface Props {
  flat: Flat;
  onClose: () => void;
}

export default function TenantCard({ flat, onClose }: Props) {
  const game = useGame((s) => s.game);
  const money = game.money;
  const repairProblem = useGame((s) => s.repairProblem);
  const t = flat.tenant;
  const factors = t ? happinessFactors(game, flat) : [];
  const tier = !t ? 'meh' : t.happiness >= 66 ? 'happy' : t.happiness >= 33 ? 'meh' : 'sad';

  return (
    <div className="tenant-card">
      <button type="button" className="card-close" onClick={onClose} aria-label={CS.ui.close}>
        ×
      </button>
      {t ? (
        <>
          <div className="card-head">
            <span className="card-emoji">{ARCHETYPE_EMOJI[t.archetype]}</span>
            <div>
              <strong>{t.name}</strong>
              <span className="card-archetype">
                {CS.archetypes[t.archetype].label} · {CS.ui.flatLabel(flat.index + 1)} ·{' '}
                {CS.ui.floorLabel(flat.floor)}
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
          {flat.problem && (
            <button
              type="button"
              className="btn btn-repair"
              disabled={money < PROBLEM_DEFS[flat.problem].repairCost}
              onClick={() => repairProblem(flat.index)}
            >
              {flat.problem === 'leak' ? '💧' : '⚽'} {CS.problems[flat.problem].repair} ·{' '}
              {formatKcs(PROBLEM_DEFS[flat.problem].repairCost)}
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
        </>
      )}
    </div>
  );
}
