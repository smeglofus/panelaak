// Azor na obchůzce — clear the courtyard of cats without walking into the
// Public Security. Clearing one hands you the next: a different courtyard, more
// cats, more officers, quicker feet. It only ends when they catch you.

import { useEffect, useReducer, useState } from 'react';
import { CS } from '../game/content.cs';
import { useGame } from '../game/store';
import { AZOR_ENERGY_COST, azorReward } from '../game/economy';
import {
  AZOR_COLS as COLS,
  AZOR_ROWS as ROWS,
  isOpen,
  mazeForRound,
  openTiles,
  roundSetup,
} from '../game/azor';

interface Pos {
  r: number;
  c: number;
}

const same = (a: Pos, b: Pos) => a.r === b.r && a.c === b.c;

/** Breadth-first step toward a target — how the VB closes in. */
function chaseStep(maze: string[], from: Pos, to: Pos): Pos {
  const key = (p: Pos) => p.r * COLS + p.c;
  const prev = new Map<number, Pos>();
  const seen = new Set<number>([key(from)]);
  const queue: Pos[] = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    if (same(cur, to)) break;
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nxt = { r: cur.r + dr, c: cur.c + dc };
      if (!isOpen(maze, nxt.r, nxt.c) || seen.has(key(nxt))) continue;
      seen.add(key(nxt));
      prev.set(key(nxt), cur);
      queue.push(nxt);
    }
  }
  let cur = to;
  if (!prev.has(key(cur)) && !same(cur, from)) return from; // unreachable
  while (prev.has(key(cur))) {
    const p = prev.get(key(cur))!;
    if (same(p, from)) return cur;
    cur = p;
  }
  return from;
}

/** Cats wander, but prefer not to walk into Azor's mouth. */
function flee(maze: string[], from: Pos, away: Pos): Pos {
  const options = [
    { r: from.r - 1, c: from.c },
    { r: from.r + 1, c: from.c },
    { r: from.r, c: from.c - 1 },
    { r: from.r, c: from.c + 1 },
    from,
  ].filter((p) => isOpen(maze, p.r, p.c));
  const dist = (p: Pos) => Math.abs(p.r - away.r) + Math.abs(p.c - away.c);
  if (Math.random() < 0.7) {
    options.sort((a, b) => dist(b) - dist(a));
    return options[0];
  }
  return options[Math.floor(Math.random() * options.length)];
}

interface State {
  round: number;
  maze: string[];
  azor: Pos;
  cats: Pos[];
  vb: Pos[];
  /** Cats caught across every courtyard this run. */
  caught: number;
  /** Courtyards fully cleared this run. */
  cleared: number;
  over: boolean;
}

type Action = { type: 'reset' } | { type: 'move'; dr: number; dc: number } | { type: 'tick' };

/** Lays out one courtyard: Azor in his corner, the rest scattered well away. */
function buildRound(round: number, carry: { caught: number; cleared: number }): State {
  const maze = mazeForRound(round);
  const setup = roundSetup(round);
  const tiles = openTiles(maze);
  const azor = { r: 1, c: 1 };
  const far = (p: Pos) => Math.abs(p.r - azor.r) + Math.abs(p.c - azor.c) > 6;
  const pool = tiles.filter(far);
  const taken: Pos[] = [];
  const take = () => {
    // Sample without collisions; the pool is far larger than what we need.
    for (let guard = 0; guard < 200; guard++) {
      const p = pool[Math.floor(Math.random() * pool.length)];
      if (!taken.some((t) => same(t, p))) {
        taken.push(p);
        return p;
      }
    }
    return pool[0];
  };
  const cats = Array.from({ length: setup.cats }, take);
  const vb = Array.from({ length: setup.vb }, take);
  return { round, maze, azor, cats, vb, caught: carry.caught, cleared: carry.cleared, over: false };
}

/** Resolve catches and collisions after any move. */
function settle(s: State): State {
  const remaining = s.cats.filter((c) => !same(c, s.azor));
  const caught = s.caught + (s.cats.length - remaining.length);
  if (s.vb.some((v) => same(v, s.azor))) {
    return { ...s, cats: remaining, caught, over: true };
  }
  if (remaining.length === 0) {
    // Courtyard clear — straight on to the next one.
    return buildRound(s.round + 1, { caught, cleared: s.cleared + 1 });
  }
  return { ...s, cats: remaining, caught };
}

function reducer(state: State, action: Action): State {
  if (action.type === 'reset') return buildRound(1, { caught: 0, cleared: 0 });
  if (state.over) return state;

  if (action.type === 'move') {
    const next = { r: state.azor.r + action.dr, c: state.azor.c + action.dc };
    if (!isOpen(state.maze, next.r, next.c)) return state;
    return settle({ ...state, azor: next });
  }

  const cats = state.cats.map((c) => flee(state.maze, c, state.azor));
  const vb = state.vb.map((v) => chaseStep(state.maze, v, state.azor));
  return settle({ ...state, cats, vb });
}

export default function AzorModal({ onClose }: { onClose: () => void }) {
  const energy = useGame((s) => s.game.energy);
  const startAzor = useGame((s) => s.startAzor);
  const rewardAzor = useGame((s) => s.rewardAzor);

  const [state, dispatch] = useReducer(reducer, null, () =>
    buildRound(1, { caught: 0, cleared: 0 }),
  );
  const [playing, setPlaying] = useState(false);

  const canAfford = energy >= AZOR_ENERGY_COST;
  const setup = roundSetup(state.round);

  const begin = () => {
    if (!startAzor()) return;
    dispatch({ type: 'reset' });
    setPlaying(true);
  };

  // Everyone else moves on the round's own clock, which quickens as it goes.
  useEffect(() => {
    if (!playing || state.over) return;
    const id = window.setInterval(() => dispatch({ type: 'tick' }), setup.stepMs);
    return () => window.clearInterval(id);
  }, [playing, state.over, setup.stepMs]);

  useEffect(() => {
    if (!playing || state.over) return;
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      const d = map[e.key];
      if (!d) return;
      dispatch({ type: 'move', dr: d[0], dc: d[1] });
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing, state.over]);

  // Pay out once, the moment the walk ends.
  useEffect(() => {
    if (playing && state.over) {
      rewardAzor(state.caught, state.cleared);
      setPlaying(false);
    }
  }, [playing, state.over, state.caught, state.cleared, rewardAzor]);

  const started = playing || state.over;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-azor" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="card-close" onClick={onClose} aria-label={CS.ui.close}>
          ×
        </button>
        <h2>{CS.azor.title}</h2>

        {!started ? (
          <>
            <p>{CS.azor.intro}</p>
            <p className="brigade-hint">{CS.azor.cost(AZOR_ENERGY_COST)}</p>
            <p className="brigade-hint">{CS.azor.controls}</p>
            <div className="modal-actions">
              <button type="button" className="btn" disabled={!canAfford} onClick={begin}>
                {CS.azor.start}
              </button>
              {!canAfford && <span className="brigade-hint">{CS.azor.tooTired}</span>}
            </div>
          </>
        ) : (
          <>
            <div className="arkada-hud">
              <span className="azor-round">{CS.azor.round(state.round)}</span>
              <span>
                🐈 <strong>{state.cats.length}</strong>
              </span>
              <span>
                {CS.azor.cats}: <strong>{state.caught}</strong>
              </span>
            </div>
            <div className="azor-board" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
              {Array.from({ length: ROWS }).flatMap((_, r) =>
                Array.from({ length: COLS }).map((__, c) => {
                  const here = { r, c };
                  const wall = state.maze[r][c] === '#';
                  const isAzor = same(state.azor, here);
                  const isCat = state.cats.some((x) => same(x, here));
                  const isVb = state.vb.some((x) => same(x, here));
                  return (
                    <div key={`${r}-${c}`} className={`azor-cell${wall ? ' azor-wall' : ''}`}>
                      {isAzor ? '🐕' : isVb ? '👮' : isCat ? '🐈' : ''}
                    </div>
                  );
                }),
              )}
            </div>
            <p className="brigade-hint">{CS.azor.controls}</p>
            {state.over && (
              <>
                <p className="arkada-over">
                  {CS.azor.caught} {CS.azor.summary(state.cleared, state.caught)}{' '}
                  {state.caught > 0 && CS.azor.win2(azorReward(state.caught, state.cleared))}
                </p>
                <div className="modal-actions">
                  <button type="button" className="btn" disabled={!canAfford} onClick={begin}>
                    {CS.azor.again}
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
