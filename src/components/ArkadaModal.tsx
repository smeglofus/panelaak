// Svazácká arkáda — a compact Tetris played from a svazák's tenant card.
// Paying elán starts a game; the final score is banked as money on game over.
// Self-contained: the engine is a pure reducer, the component only drives it.

import { useEffect, useReducer, useState } from 'react';
import { CS } from '../game/content.cs';
import { useGame } from '../game/store';
import { ARKADA_ENERGY_COST, arkadaReward } from '../game/economy';

const COLS = 10;
const ROWS = 18;

type Grid = number[][];
interface Piece {
  m: number[][];
  x: number;
  y: number;
  color: number;
}

// Base shapes; color index (1–7) doubles as the CSS class suffix.
const SHAPES: number[][][] = [
  [[1, 1, 1, 1]], // I → 1
  [
    [1, 1],
    [1, 1],
  ], // O → 2
  [
    [0, 1, 0],
    [1, 1, 1],
  ], // T → 3
  [
    [0, 1, 1],
    [1, 1, 0],
  ], // S → 4
  [
    [1, 1, 0],
    [0, 1, 1],
  ], // Z → 5
  [
    [1, 0, 0],
    [1, 1, 1],
  ], // J → 6
  [
    [0, 0, 1],
    [1, 1, 1],
  ], // L → 7
];

const LINE_SCORE = [0, 100, 300, 500, 800];

function emptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
}

function rotate(m: number[][]): number[][] {
  const rows = m.length;
  const cols = m[0].length;
  const out: number[][] = Array.from({ length: cols }, () => Array<number>(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out[c][rows - 1 - r] = m[r][c];
    }
  }
  return out;
}

function spawnPiece(): Piece {
  const i = Math.floor(Math.random() * SHAPES.length);
  const m = SHAPES[i];
  return { m, x: Math.floor((COLS - m[0].length) / 2), y: 0, color: i + 1 };
}

function collides(grid: Grid, m: number[][], px: number, py: number): boolean {
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[r].length; c++) {
      if (!m[r][c]) continue;
      const x = px + c;
      const y = py + r;
      if (x < 0 || x >= COLS || y >= ROWS) return true;
      if (y >= 0 && grid[y][x]) return true;
    }
  }
  return false;
}

function merge(grid: Grid, p: Piece): Grid {
  const out = grid.map((row) => row.slice());
  for (let r = 0; r < p.m.length; r++) {
    for (let c = 0; c < p.m[r].length; c++) {
      if (p.m[r][c] && p.y + r >= 0) out[p.y + r][p.x + c] = p.color;
    }
  }
  return out;
}

function clearLines(grid: Grid): { grid: Grid; cleared: number } {
  const kept = grid.filter((row) => row.some((cell) => !cell));
  const cleared = ROWS - kept.length;
  while (kept.length < ROWS) kept.unshift(Array<number>(COLS).fill(0));
  return { grid: kept, cleared };
}

interface State {
  grid: Grid;
  piece: Piece;
  score: number;
  lines: number;
  over: boolean;
}

type Action =
  | { type: 'reset' }
  | { type: 'move'; dx: number }
  | { type: 'rotate' }
  | { type: 'down' }
  | { type: 'hard' };

function init(): State {
  return { grid: emptyGrid(), piece: spawnPiece(), score: 0, lines: 0, over: false };
}

/** Lock the current piece, clear lines, score, and bring the next one in. */
function lock(state: State): State {
  const merged = merge(state.grid, state.piece);
  const { grid, cleared } = clearLines(merged);
  const next = spawnPiece();
  const over = collides(grid, next.m, next.x, next.y);
  return {
    grid,
    piece: next,
    score: state.score + LINE_SCORE[cleared],
    lines: state.lines + cleared,
    over,
  };
}

function reducer(state: State, action: Action): State {
  if (action.type === 'reset') return init();
  if (state.over) return state;
  const p = state.piece;
  switch (action.type) {
    case 'move': {
      if (!collides(state.grid, p.m, p.x + action.dx, p.y)) {
        return { ...state, piece: { ...p, x: p.x + action.dx } };
      }
      return state;
    }
    case 'rotate': {
      const m = rotate(p.m);
      for (const dx of [0, -1, 1, -2, 2]) {
        if (!collides(state.grid, m, p.x + dx, p.y)) {
          return { ...state, piece: { ...p, m, x: p.x + dx } };
        }
      }
      return state;
    }
    case 'down': {
      if (!collides(state.grid, p.m, p.x, p.y + 1)) {
        return { ...state, piece: { ...p, y: p.y + 1 } };
      }
      return lock(state);
    }
    case 'hard': {
      let y = p.y;
      while (!collides(state.grid, p.m, p.x, y + 1)) y++;
      return lock({ ...state, piece: { ...p, y } });
    }
    default:
      return state;
  }
}

export default function ArkadaModal({ onClose }: { onClose: () => void }) {
  const energy = useGame((s) => s.game.energy);
  const startArkada = useGame((s) => s.startArkada);
  const rewardArkada = useGame((s) => s.rewardArkada);

  // phase: null = intro, otherwise a live/finished game state.
  const [state, dispatch] = useReducer(reducer, null, init);
  const [playing, setPlaying] = useState(false);

  const canAfford = energy >= ARKADA_ENERGY_COST;

  const begin = () => {
    if (!startArkada()) return;
    dispatch({ type: 'reset' });
    setPlaying(true);
  };

  // Gravity — speeds up every 10 cleared lines. Runs only while playing.
  useEffect(() => {
    if (!playing || state.over) return;
    const level = Math.floor(state.lines / 10);
    const speed = Math.max(140, 600 - level * 45);
    const id = window.setInterval(() => dispatch({ type: 'down' }), speed);
    return () => window.clearInterval(id);
  }, [playing, state.over, state.lines]);

  // Keyboard controls while playing.
  useEffect(() => {
    if (!playing || state.over) return;
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          dispatch({ type: 'move', dx: -1 });
          break;
        case 'ArrowRight':
          dispatch({ type: 'move', dx: 1 });
          break;
        case 'ArrowUp':
          dispatch({ type: 'rotate' });
          break;
        case 'ArrowDown':
          dispatch({ type: 'down' });
          break;
        case ' ':
          dispatch({ type: 'hard' });
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing, state.over]);

  // Bank the reward once, the moment the game ends.
  useEffect(() => {
    if (playing && state.over) {
      rewardArkada(state.score);
      setPlaying(false);
    }
  }, [playing, state.over, state.score, rewardArkada, setPlaying]);

  // Display grid = locked cells + the falling piece.
  const display = state.grid.map((row) => row.slice());
  if (playing || state.over) {
    const p = state.piece;
    for (let r = 0; r < p.m.length; r++) {
      for (let c = 0; c < p.m[r].length; c++) {
        if (p.m[r][c] && p.y + r >= 0) display[p.y + r][p.x + c] = p.color;
      }
    }
  }

  const started = playing || state.over;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-arkada" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="card-close" onClick={onClose} aria-label={CS.ui.close}>
          ×
        </button>
        <h2>{CS.arkada.title}</h2>

        {!started ? (
          <>
            <p>{CS.arkada.intro}</p>
            <p className="brigade-hint">{CS.arkada.cost(ARKADA_ENERGY_COST)}</p>
            <p className="brigade-hint">{CS.arkada.controls}</p>
            <div className="modal-actions">
              <button type="button" className="btn" disabled={!canAfford} onClick={begin}>
                {CS.arkada.start}
              </button>
              {!canAfford && <span className="brigade-hint">{CS.arkada.tooTired}</span>}
            </div>
          </>
        ) : (
          <>
            <div className="arkada-hud">
              <span>
                {CS.arkada.score}: <strong>{state.score}</strong>
              </span>
              <span>
                {CS.arkada.lines}: <strong>{state.lines}</strong>
              </span>
            </div>
            <div
              className="arkada-board"
              style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
            >
              {display.flatMap((row, r) =>
                row.map((cell, c) => (
                  <div key={`${r}-${c}`} className={`arkada-cell${cell ? ` arkada-c${cell}` : ''}`} />
                )),
              )}
            </div>
            {state.over && (
              <>
                <p className="arkada-over">
                  {CS.arkada.gameOver} — {CS.arkada.reward(arkadaReward(state.score))}
                </p>
                <div className="modal-actions">
                  <button type="button" className="btn" disabled={!canAfford} onClick={begin}>
                    {CS.arkada.again}
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
