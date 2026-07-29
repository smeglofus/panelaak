// Panel na místo — the crane game. A panel swings across the top of the stack;
// drop it, and whatever hangs over the panel below is trimmed off, so the target
// keeps shrinking. Pays in a discount on the next floor rather than in Kčs,
// which is what pulls a good run back into the main loop.

import { useEffect, useRef, useState } from 'react';
import { CS } from '../game/content.cs';
import { useGame } from '../game/store';
import { jerabDiscount, MINIGAME_ENERGY } from '../game/economy';

const BOARD_W = 260;
const PANEL_H = 14;
const VISIBLE_ROWS = 9;
const START_W = 120;
/** Below this the panel is too small to sit on anything — the run is over. */
const MIN_W = 12;

interface Panel {
  x: number;
  w: number;
}

const ENERGY = MINIGAME_ENERGY.jerab;

export default function JerabModal({ onClose }: { onClose: () => void }) {
  const energy = useGame((s) => s.game.energy);
  const banked = useGame((s) => s.game.floorDiscount);
  const startMinigame = useGame((s) => s.startMinigame);
  const rewardJerab = useGame((s) => s.rewardJerab);

  const [stack, setStack] = useState<Panel[]>([]);
  const [hookX, setHookX] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [over, setOver] = useState(false);
  const dirRef = useRef(1);
  const rafRef = useRef<number | null>(null);

  const canAfford = energy >= ENERGY;
  const top = stack[stack.length - 1];
  const currentW = top ? top.w : START_W;

  const begin = () => {
    if (!startMinigame('jerab')) return;
    setStack([{ x: (BOARD_W - START_W) / 2, w: START_W }]);
    setHookX(0);
    dirRef.current = 1;
    setOver(false);
    setPlaying(true);
  };

  // The hook sweeps back and forth; it speeds up as the stack grows.
  useEffect(() => {
    if (!playing || over) return;
    let last = performance.now();
    const speed = 90 + stack.length * 12; // px per second
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setHookX((x) => {
        let next = x + dirRef.current * speed * dt;
        const max = BOARD_W - currentW;
        if (next <= 0) {
          next = 0;
          dirRef.current = 1;
        } else if (next >= max) {
          next = max;
          dirRef.current = -1;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, over, stack.length, currentW]);

  const drop = () => {
    if (!playing || over || !top) return;
    // Overlap with the panel below is what survives; the rest is trimmed.
    const left = Math.max(hookX, top.x);
    const right = Math.min(hookX + currentW, top.x + top.w);
    const overlap = right - left;
    if (overlap < MIN_W) {
      setOver(true);
      rewardJerab(stack.length - 1); // the base panel doesn't count
      return;
    }
    setStack((s) => [...s, { x: left, w: overlap }]);
  };

  // Space drops too — a crane cab has one lever.
  useEffect(() => {
    if (!playing || over) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ') return;
      drop();
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const placed = Math.max(0, stack.length - 1);
  const shown = stack.slice(-VISIBLE_ROWS);
  const started = playing || over;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-jerab" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="card-close" onClick={onClose} aria-label={CS.ui.close}>
          ×
        </button>
        <h2>{CS.jerab.title}</h2>

        {!started ? (
          <>
            <p>{CS.jerab.intro}</p>
            <p className="brigade-hint">{CS.jerab.cost(ENERGY)}</p>
            <p className="brigade-hint">{CS.jerab.controls}</p>
            {banked > 0 && (
              <p className="brigade-hint">{CS.jerab.banked(Math.round(banked * 100))}</p>
            )}
            <div className="modal-actions">
              <button type="button" className="btn" disabled={!canAfford} onClick={begin}>
                {CS.jerab.start}
              </button>
              {!canAfford && <span className="brigade-hint">{CS.jerab.tooTired}</span>}
            </div>
          </>
        ) : (
          <>
            <div className="arkada-hud">
              <span>
                {CS.jerab.panels}: <strong>{placed}</strong>
              </span>
              <span>{Math.round(jerabDiscount(placed) * 100)} %</span>
            </div>
            <div className="jerab-board" style={{ width: BOARD_W }}>
              {!over && (
                <div
                  className="jerab-hook"
                  style={{ left: hookX, width: currentW, height: PANEL_H }}
                />
              )}
              {/* The container is column-reverse, so the first child sits at
                  the bottom — feed it oldest-first and the base stays down. */}
              <div className="jerab-stack">
                {shown.map((p, i) => (
                  <div
                    key={stack.length - shown.length + i}
                    className="jerab-panel"
                    style={{ left: p.x, width: p.w, height: PANEL_H }}
                  />
                ))}
              </div>
            </div>
            {!over ? (
              <div className="modal-actions">
                <button type="button" className="btn" onClick={drop}>
                  ⬇ {CS.jerab.drop}
                </button>
              </div>
            ) : (
              <>
                <p className="arkada-over">
                  {CS.jerab.over} {CS.jerab.reward(Math.round(jerabDiscount(placed) * 100))}
                </p>
                <div className="modal-actions">
                  <button type="button" className="btn" disabled={!canAfford} onClick={begin}>
                    {CS.jerab.again}
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
