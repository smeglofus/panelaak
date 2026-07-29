// Courtyards and difficulty curve for Azor's walk. Kept out of the component so
// the two things that would quietly ruin the game — an unreachable corner of a
// maze, or a round that jumps from easy to impossible — can be tested.

/** Every courtyard is the same size, so the board never resizes mid-run. */
export const AZOR_COLS = 15;
export const AZOR_ROWS = 11;

export const MAZES: readonly string[][] = [
  [
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
  ],
  [
    '###############',
    '#.............#',
    '#.###.###.###.#',
    '#...#.....#...#',
    '###.#.###.#.###',
    '#.....#.#.....#',
    '###.#.#.#.#.###',
    '#...#.....#...#',
    '#.###.###.###.#',
    '#.............#',
    '###############',
  ],
  [
    '###############',
    '#.#.........#.#',
    '#.#.#####.#.#.#',
    '#...#...#...#.#',
    '#.###.#.#.###.#',
    '#.....#.#.....#',
    '#.###.#.#.###.#',
    '#...#...#...#.#',
    '#.#.#####.#.#.#',
    '#.#.........#.#',
    '###############',
  ],
];

export function mazeForRound(round: number): string[] {
  return MAZES[(round - 1) % MAZES.length];
}

export interface RoundSetup {
  cats: number;
  /** How many Public Security officers are on the prowl. */
  vb: number;
  /** Milliseconds between moves of everyone but Azor — lower is faster. */
  stepMs: number;
}

export const AZOR_MAX_CATS = 9;
export const AZOR_MAX_VB = 4;
export const AZOR_MIN_STEP_MS = 170;

/** Rounds never stop coming; they just get busier and quicker. */
export function roundSetup(round: number): RoundSetup {
  return {
    cats: Math.min(AZOR_MAX_CATS, 4 + round),
    vb: Math.min(AZOR_MAX_VB, 1 + Math.ceil(round / 2)),
    stepMs: Math.max(AZOR_MIN_STEP_MS, 340 - (round - 1) * 22),
  };
}

/** True when the tile is walkable. */
export function isOpen(maze: string[], r: number, c: number): boolean {
  return r >= 0 && r < AZOR_ROWS && c >= 0 && c < AZOR_COLS && maze[r][c] !== '#';
}

/** Every walkable tile of a maze. */
export function openTiles(maze: string[]): { r: number; c: number }[] {
  const out: { r: number; c: number }[] = [];
  for (let r = 0; r < AZOR_ROWS; r++) {
    for (let c = 0; c < AZOR_COLS; c++) if (isOpen(maze, r, c)) out.push({ r, c });
  }
  return out;
}

/** Tiles reachable on foot from a starting tile — used to verify the mazes. */
export function reachable(maze: string[], from: { r: number; c: number }): Set<number> {
  const key = (r: number, c: number) => r * AZOR_COLS + c;
  const seen = new Set<number>([key(from.r, from.c)]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const r = cur.r + dr;
      const c = cur.c + dc;
      if (!isOpen(maze, r, c) || seen.has(key(r, c))) continue;
      seen.add(key(r, c));
      queue.push({ r, c });
    }
  }
  return seen;
}
