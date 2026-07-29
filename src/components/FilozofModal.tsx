// Cesta domů — steer pan Lojza down the pavement. He drifts on his own and the
// arrows only nudge him back; hit a lamppost or wander off the kerb and the walk
// ends on a bench. Pays in důvěra: getting him home is what neighbours notice.

import { useEffect, useRef, useState } from 'react';
import { CS } from '../game/content.cs';
import { useGame } from '../game/store';
import { filozofReward, MINIGAME_ENERGY } from '../game/economy';
import { GLYPH, hits, LANE_H, LANE_W } from '../game/filozof';

const TICK_MS = 60;
/** Metres of pavement per tick. */
const SPEED = 1.6;

const ENERGY = MINIGAME_ENERGY.filozof;

interface Obstacle {
  y: number;
  x: number;
  kind: string;
}

const KINDS = ['🪧', '🛋️', '🗑️', '🌳'];

export default function FilozofModal({ onClose }: { onClose: () => void }) {
  const energy = useGame((s) => s.game.energy);
  const startMinigame = useGame((s) => s.startMinigame);
  const rewardFilozof = useGame((s) => s.rewardFilozof);

  const [x, setX] = useState(LANE_W / 2);
  const [meters, setMeters] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [playing, setPlaying] = useState(false);
  const [over, setOver] = useState(false);
  /** His own sway — the reason steering is needed at all. */
  const swayRef = useRef(0);
  const leanRef = useRef(0);
  const paidRef = useRef(false);

  const canAfford = energy >= ENERGY;

  const begin = () => {
    if (!startMinigame('filozof')) return;
    setX(LANE_W / 2);
    setMeters(0);
    setObstacles([]);
    swayRef.current = 0;
    leanRef.current = 0;
    paidRef.current = false;
    setOver(false);
    setPlaying(true);
  };

  useEffect(() => {
    if (!playing || over) return;
    const id = window.setInterval(() => {
      // Lojza's drift wanders slowly; the player's lean is added on top.
      swayRef.current += (Math.random() - 0.5) * 0.9;
      swayRef.current = Math.max(-2.4, Math.min(2.4, swayRef.current));

      setX((cur) => {
        const next = cur + swayRef.current + leanRef.current * 3.2;
        if (next < GLYPH / 2 || next > LANE_W - GLYPH / 2) {
          setOver(true); // off the kerb
          return cur;
        }
        return next;
      });

      setMeters((m) => m + SPEED);

      setObstacles((list) => {
        const moved = list
          .map((o) => ({ ...o, y: o.y + 6 }))
          .filter((o) => o.y < LANE_H + 40);
        if (Math.random() < 0.14) {
          moved.push({
            y: -40,
            x: 20 + Math.random() * (LANE_W - 40 - GLYPH),
            kind: KINDS[Math.floor(Math.random() * KINDS.length)],
          });
        }
        return moved;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [playing, over]);

  // Collisions are judged against the drawn glyphs (see game/filozof.ts).
  useEffect(() => {
    if (!playing || over) return;
    if (obstacles.some((o) => hits(x, o))) setOver(true);
  }, [obstacles, x, playing, over]);

  useEffect(() => {
    if (!playing || over) return;
    const down = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') leanRef.current = -1;
      else if (e.key === 'ArrowRight') leanRef.current = 1;
      else return;
      e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') leanRef.current = 0;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [playing, over]);

  // Pay out once, when he sits down.
  useEffect(() => {
    if (!over || paidRef.current) return;
    paidRef.current = true;
    rewardFilozof(meters);
    setPlaying(false);
  }, [over, meters, rewardFilozof]);

  const started = playing || over;
  const rep = filozofReward(meters);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-filozof" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="card-close" onClick={onClose} aria-label={CS.ui.close}>
          ×
        </button>
        <h2>{CS.filozof.title}</h2>

        {!started ? (
          <>
            <p>{CS.filozof.intro}</p>
            <p className="brigade-hint">{CS.filozof.cost(ENERGY)}</p>
            <p className="brigade-hint">{CS.filozof.controls}</p>
            <div className="modal-actions">
              <button type="button" className="btn" disabled={!canAfford} onClick={begin}>
                {CS.filozof.start}
              </button>
              {!canAfford && <span className="brigade-hint">{CS.filozof.tooTired}</span>}
            </div>
          </>
        ) : (
          <>
            <div className="arkada-hud">
              <span>
                {CS.filozof.meters}: <strong>{Math.floor(meters)} m</strong>
              </span>
              <span>🤝 {rep}</span>
            </div>
            <div className="filozof-lane" style={{ width: LANE_W, height: LANE_H }}>
              {obstacles.map((o, i) => (
                <span key={i} className="filozof-obstacle" style={{ left: o.x, top: o.y }}>
                  {o.kind}
                </span>
              ))}
              <span className="filozof-lojza" style={{ left: x - GLYPH / 2 }}>
                🥴
              </span>
            </div>
            <p className="brigade-hint">{CS.filozof.controls}</p>
            {over && (
              <>
                <p className="arkada-over">
                  {CS.filozof.fell} {rep > 0 && CS.filozof.reward(rep)}
                </p>
                <div className="modal-actions">
                  <button type="button" className="btn" disabled={!canAfford} onClick={begin}>
                    {CS.filozof.again}
                  </button>
                  <button type="button" className="btn-newgame" onClick={onClose}>
                    {CS.ui.close}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
