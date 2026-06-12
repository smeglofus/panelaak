// Index card shown when a flat is clicked: tenant identity, happiness, rent
// contribution and one line of flavor (spec §6.3 acceptance).

import type { Flat } from '../game/types';
import { ARCHETYPE_EMOJI, CS } from '../game/content.cs';
import { ARCHETYPES } from '../game/tenants';
import { formatKcs, formatKcsPerSec, LEAK_REPAIR_COST, tenantRentPerSec } from '../game/economy';
import { useGame } from '../game/store';

interface Props {
  flat: Flat;
  onClose: () => void;
}

export default function TenantCard({ flat, onClose }: Props) {
  const money = useGame((s) => s.game.money);
  const repairLeak = useGame((s) => s.repairLeak);
  const t = flat.tenant;
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
            <span className="card-num">{formatKcsPerSec(tenantRentPerSec(t))}</span>
          </div>
          <div className="card-quirk">{ARCHETYPES[t.archetype].quirk}</div>
          <p className="card-flavor">{t.flavor}</p>
          {flat.problem === 'leak' && (
            <button
              type="button"
              className="btn btn-repair"
              disabled={money < LEAK_REPAIR_COST}
              onClick={() => repairLeak(flat.index)}
            >
              💧 {CS.ui.repairLeak} · {formatKcs(LEAK_REPAIR_COST)}
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
