// Azor na obchůzce — round up every cat in the courtyard without walking into
// the Public Security. Unlocked in Tuzex, played from a pensioner's card.
// Tile-based: Azor steps on arrow keys, the others step on a timer.

import { useEffect, useMemo, useReducer } from 'react';
import { CS } from '../game/content.cs';
import { useGame } from '../game/store';
import { AZOR_ENERGY_COST, azorReward } from '../game/economy';

// '#' wall, '.' open. A courtyard between the blocks: benches, a sandbox and
// the eternal shortcut across the grass.
const MAZE = [
  '###############',
  '#.....#.......#',
  '#.###.#.#####.#',
  '#.#...........#',
  '#.#.#.#####.#.#',
  '#...#...#...#.#',
  '#.#####.#.###.#',
  '#.......#.....#',
  '#.###.#####.#.#',
  '#.#...........#',
  '###############',
];
const ROWS = MAZE.length;
const COLS = MAZE[0].length;

const CAT_COUNT = 5;
const STEP_MS = 320;

interface Pos {
  r: number;
  c: number;
}

const open = (r: number, c: number) =>
  r >= 0 && r < ROWS && c >= 0 && c < COLS && MAZE[r][c] !== '#';

const same = (a: Pos, b: Pos) => a.r === b.r && a.c === b.c;

/** Every open tile, so we can scatter the cast without landing in a wall. */
function openTiles(): Pos[] {
  const out: Pos[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) if (open(r, c)) out.push({ r, c });
  }
  return out;
}

/** Breadth-first step toward a target — how the VB closes in. */
function chaseStep(from: Pos, to: Pos): Pos {
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
      if (!open(nxt.r, nxt.c) || seen.has(key(nxt))) continue;
      seen.add(key(nxt));
      prev.set(key(nxt), cur);
      queue.push(nxt);
    }
  }
  // Walk the chain back to the tile right after `from`.
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
function flee(from: Pos, away: Pos): Pos {
  const options = [
    { r: from.r - 1, c: from.c },
    { r: from.r + 1, c: from.c },
    { r: from.r, c: from.c - 1 },
    { r: from.r, c: from.c + 1 },
    from,
  ].filter((p) => open(p.r, p.c));
  const dist = (p: Pos) => Math.abs(p.r - away.r) + Math.abs(p.c - away.c);
  // Mostly step away from the dog, sometimes dither — a cat is a cat.
  if (Math.random() < 0.7) {
    options.sort((a, b) => dist(b) - dist(a));
    return options[0];
  }
  return options[Math.floor(Math.random() * options.length)];
}

interface State {
  azor: Pos;
  cats: Pos[];
  vb: Pos[];
  caught: number;
  over: boolean;
  won: boolean;
}

type Action = { type: 'reset' } | { type: 'move'; dr: number; dc: number } | { type: 'tick' };

function init(): State {
  const tiles = openTiles();
  const pick = () => tiles[Math.floor(Math.random() * tiles.length)];
  const azor = { r: 1, c: 1 };
  const far = (p: Pos) => Math.abs(p.r - azor.r) + Math.abs(p.c - azor.c) > 6;
  const cats: Pos[] = [];
  while (cats.length < CAT_COUNT) {
    const p = pick();
    if (far(p) && !cats.some((c) => same(c, p))) cats.push(p);
  }
  const vb: Pos[] = [];
  while (vb.length < 2) {
    const p = pick();
    if (far(p) && !vb.some((v) => same(v, p))) vb.push(p);
  }
  return { azor, cats, vb, caught: 0, over: false, won: false };
}

function settle(s: State): State {
  // Cats Azor is standing on are rounded up; a VB on the same tile ends it.
  const remaining = s.cats.filter((c) => !same(c, s.azor));
  const caught = s.caught + (s.cats.length - remaining.length);
  const nabbed = s.vb.some((v) => same(v, s.azor));
  return {
    ...s,
    cats: remaining,
    caught,
    over: nabbed || remaining.length === 0,
    won: !nabbed && remaining.length === 0,
  };
}

function reducer(state: State, action: Action): State {
  if (action.type === 'reset') return init();
  if (state.over) return state;

  if (action.type === 'move') {
    const next = { r: state.azor.r + action.dr, c: state.azor.c + action.dc };
    if (!open(next.r, next.c)) return state;
    return settle({ ...state, azor: next });
  }

  // 'tick' — everyone else moves.
  const cats = state.cats.map((c) => flee(c, state.azor));
  const vb = state.vb.map((v) => chaseStep(v, state.azor));
  return settle({ ...state, cats, vb });
}

export default function AzorModal({ onClose }: { onClose: () => void }) {
  const energy = useGame((s) => s.game.energy);
  const startAzor = useGame((s) => s.startAzor);
  const rewardAzor = useGame((s) => s.rewardAzor);

  const [state, dispatch] = useReducer(reducer, null, init);
  const [playing, setPlaying] = useReducerPlaying();

  const canAfford = energy >= AZOR_ENERGY_COST;

  const begin = () => {
    if (!startAzor()) return;
    dispatch({ type: 'reset' });
    setPlaying(true);
  };

  // The rest of the courtyard moves on its own clock.
  useEffect(() => {
    if (!playing || state.over) return;
    const id = window.setInterval(() => dispatch({ type: 'tick' }), STEP_MS);
    return () => window.clearInterval(id);
  }, [playing, state.over]);

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
      rewardAzor(state.caught);
      setPlaying(false);
    }
  }, [playing, state.over, state.caught, rewardAzor, setPlaying]);

  const started = playing || state.over;

  const cells = useMemo(() => {
    const grid: string[][] = MAZE.map((row) => row.split(''));
    return grid;
  }, []);

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
              <span>
                {CS.azor.cats}: <strong>{state.caught}</strong> / {CAT_COUNT}
              </span>
            </div>
            <div
              className="azor-board"
              style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
            >
              {cells.flatMap((row, r) =>
                row.map((tile, c) => {
                  const here = { r, c };
                  const isAzor = same(state.azor, here);
                  const isCat = state.cats.some((x) => same(x, here));
                  const isVb = state.vb.some((x) => same(x, here));
                  return (
                    <div key={`${r}-${c}`} className={`azor-cell${tile === '#' ? ' azor-wall' : ''}`}>
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
                  {state.won ? CS.azor.win : CS.azor.caught}{' '}
                  {state.caught > 0 && CS.azor.win2(azorReward(state.caught))}
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

// Small local state hook kept separate so the component body stays readable.
function useReducerPlaying(): [boolean, (v: boolean) => void] {
  const [v, set] = useReducer((_: boolean, next: boolean) => next, false);
  return [v, set];
}
