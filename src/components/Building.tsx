// CSS cross-section of the panelák (spec §6.1). Pure CSS/SVG + emoji — the
// building view alone has to say "panelák" in one screenshot.

import type { GameState } from '../game/types';
import { floorCost, formatKcs, isElevatorRelevant, MAX_FLOORS } from '../game/economy';
import { CS } from '../game/content.cs';
import { useGame } from '../game/store';
import FlatCell from './FlatCell';

interface Props {
  game: GameState;
  bIdx: number;
  selected: number | null;
  onSelectFlat: (index: number) => void;
}

export default function Building({ game, bIdx, selected, onSelectFlat }: Props) {
  const b = game.buildings[bIdx];
  const hasElevator = isElevatorRelevant(b);
  const buyFloor = useGame((s) => s.buyFloor);
  const nextCost = floorCost(b.floors, game.meta.perks.beton);
  const floorsTopDown = Array.from({ length: b.floors }, (_, i) => b.floors - i);

  return (
    <div className="building-wrap">
      {b.floors < MAX_FLOORS ? (
        <button
          type="button"
          className="buy-floor"
          disabled={game.money < nextCost}
          onClick={() => buyFloor(bIdx)}
        >
          🏗️ {CS.ui.buyFloor} · {formatKcs(nextCost)}
        </button>
      ) : (
        <div className="buy-floor-maxed">{CS.ui.maxFloorsNote}</div>
      )}

      <div className="building">
        <div className="roof">
          {hasElevator && <div className="machine-room" />}
          {game.upgrades.satellite && (
            <span className="satellite" title={CS.upgrades.satellite.name}>
              📡
            </span>
          )}
          <AntennaSvg />
        </div>

        {floorsTopDown.map((floor) => (
          <div className="floor-row" key={floor}>
            {hasElevator && (
              <div className="shaft">
                <div className="luxfery" />
                {b.elevatorBroken && floor === b.floors && (
                  <span className="shaft-warning" title={CS.ui.elevatorBrokenSign}>
                    ⚠️
                  </span>
                )}
              </div>
            )}
            {b.flats
              .filter((f) => f.floor === floor)
              .map((f) => (
                <FlatCell
                  key={f.index}
                  flat={f}
                  selected={selected === f.index}
                  onSelect={() => onSelectFlat(f.index)}
                />
              ))}
          </div>
        ))}

        <div className="ground-row">
          {hasElevator && (
            <div className="shaft shaft-ground">
              {b.elevatorBroken ? (
                <div className="outoforder">
                  <strong>{CS.ui.elevatorBrokenSign}</strong>
                  <span>{CS.ui.elevatorBrokenSub}</span>
                </div>
              ) : (
                <div className="elevator-door" />
              )}
            </div>
          )}
          <div className="entrance">
            <div className="house-number">{bIdx === 0 ? CS.ui.houseNumber : `${bIdx + 1}/E`}</div>
            {bIdx === 0 && game.milestones.vzornyDum && (
              <div className="plaque">{CS.ui.plaque}</div>
            )}
            <div className="canopy" />
            <div className="door" />
          </div>
          <div className="kocarkarna">
            <div className="kocarkarna-window">🚲</div>
            <span className="ground-label kocarkarna-label">{CS.ui.kocarkarna}</span>
          </div>
        </div>
      </div>

      <KlepadloSvg />
    </div>
  );
}

/** The iconic TV antenna on the flat roof. */
function AntennaSvg() {
  return (
    <svg className="antenna" viewBox="0 0 60 70" width="54" height="63" aria-hidden>
      <line x1="30" y1="70" x2="30" y2="8" stroke="#3c3c38" strokeWidth="2.5" />
      <line x1="12" y1="14" x2="48" y2="14" stroke="#3c3c38" strokeWidth="2" />
      <line x1="16" y1="24" x2="44" y2="24" stroke="#3c3c38" strokeWidth="2" />
      <line x1="20" y1="34" x2="40" y2="34" stroke="#3c3c38" strokeWidth="2" />
      <line x1="30" y1="22" x2="12" y2="66" stroke="#55554f" strokeWidth="1" />
      <line x1="30" y1="22" x2="48" y2="66" stroke="#55554f" strokeWidth="1" />
    </svg>
  );
}

/** Carpet-beating rack — no sídliště is complete without one. */
function KlepadloSvg() {
  return (
    <svg className="klepadlo" viewBox="0 0 90 52" width="90" height="52" aria-hidden>
      <line x1="10" y1="52" x2="10" y2="12" stroke="#4a4a44" strokeWidth="3" />
      <line x1="45" y1="52" x2="45" y2="12" stroke="#4a4a44" strokeWidth="3" />
      <line x1="80" y1="52" x2="80" y2="12" stroke="#4a4a44" strokeWidth="3" />
      <line x1="6" y1="12" x2="84" y2="12" stroke="#4a4a44" strokeWidth="3" />
      <rect x="16" y="12" width="22" height="28" fill="#7d4d44" />
      <line x1="16" y1="20" x2="38" y2="20" stroke="#5e3a33" strokeWidth="2" />
      <line x1="16" y1="28" x2="38" y2="28" stroke="#5e3a33" strokeWidth="2" />
      <line x1="27" y1="12" x2="27" y2="40" stroke="#5e3a33" strokeWidth="1.5" />
    </svg>
  );
}
