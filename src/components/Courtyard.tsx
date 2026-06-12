// Courtyard buildables rendered in the scene next to the building —
// the dvorek is part of the screenshot, not just a menu.

import type { GameState } from '../game/types';
import { CS } from '../game/content.cs';

export default function Courtyard({ game }: { game: GameState }) {
  const c = game.courtyard;
  if (!Object.values(c).some(Boolean)) return null;

  return (
    <div className="courtyard">
      {c.piskoviste && (
        <div className="cy-item cy-sandbox" title={CS.courtyard.piskoviste.name}>
          <div className="cy-sand" />
        </div>
      )}
      {c.lavicky && <BenchSvg title={CS.courtyard.lavicky.name} />}
      {c.zahonky && (
        <div className="cy-item cy-beds" title={CS.courtyard.zahonky.name}>
          <div /> <div /> <div />
        </div>
      )}
      {c.susak && <DryerSvg title={CS.courtyard.susak.name} />}
      {c.garaz && (
        <div className="cy-item cy-garage" title={CS.courtyard.garaz.name}>
          <div className="cy-garage-door" />
        </div>
      )}
    </div>
  );
}

function BenchSvg({ title }: { title: string }) {
  return (
    <svg className="cy-item" viewBox="0 0 44 24" width="44" height="24" aria-hidden>
      <title>{title}</title>
      <rect x="2" y="8" width="40" height="4" fill="#7a5b3a" />
      <rect x="2" y="2" width="40" height="4" fill="#7a5b3a" />
      <line x1="7" y1="10" x2="7" y2="24" stroke="#4a4a44" strokeWidth="3" />
      <line x1="37" y1="10" x2="37" y2="24" stroke="#4a4a44" strokeWidth="3" />
    </svg>
  );
}

function DryerSvg({ title }: { title: string }) {
  return (
    <svg className="cy-item" viewBox="0 0 52 48" width="52" height="48" aria-hidden>
      <title>{title}</title>
      <line x1="26" y1="48" x2="26" y2="6" stroke="#4a4a44" strokeWidth="3" />
      <polygon points="26,6 4,22 48,22" fill="none" stroke="#5e5e57" strokeWidth="2" />
      <line x1="4" y1="22" x2="48" y2="22" stroke="#5e5e57" strokeWidth="2" />
      <rect x="9" y="22" width="10" height="9" fill="#d8d8d2" opacity="0.9" />
      <rect x="31" y="22" width="12" height="7" fill="#a8554a" opacity="0.85" />
    </svg>
  );
}
