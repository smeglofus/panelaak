// Pure logic of the kutil's pipe puzzle: board generation and the flow check.
// Kept out of the component so the one thing that must never break — that every
// board it hands the player can actually be solved — is testable.

export const POTRUBI_COLS = 5;
export const POTRUBI_ROWS = 5;

// Open sides as a bitmask. Rotating right maps each bit to the next one round,
// which is a shift with the top bit wrapped.
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

export function rotate(mask: number): number {
  return ((mask << 1) | (mask >> 3)) & 0b1111;
}

const OPPOSITE: Record<number, number> = { [N]: S, [E]: W, [S]: N, [W]: E };
const DELTA: Record<number, [number, number]> = {
  [N]: [-1, 0],
  [E]: [0, 1],
  [S]: [1, 0],
  [W]: [0, -1],
};

export interface Board {
  /** What the player sees — the solution with every piece randomly turned. */
  cells: number[];
  /** The orientation that lets the water through; used only by tests. */
  solution: number[];
  startRow: number;
  endRow: number;
}

/** Lays a random path from the left edge to the right edge, then dresses it. */
export function generate(rand: () => number = Math.random): Board {
  const masks = Array<number>(POTRUBI_ROWS * POTRUBI_COLS).fill(0);
  const startRow = Math.floor(rand() * POTRUBI_ROWS);
  let r = startRow;
  let c = 0;
  masks[r * POTRUBI_COLS + c] |= W; // fed from the meter outside the grid

  while (c < POTRUBI_COLS - 1) {
    // Wander vertically a little, then always make progress to the right.
    if (rand() < 0.45) {
      const dir = rand() < 0.5 ? -1 : 1;
      const nr = r + dir;
      if (nr >= 0 && nr < POTRUBI_ROWS && masks[nr * POTRUBI_COLS + c] === 0) {
        masks[r * POTRUBI_COLS + c] |= dir === -1 ? N : S;
        masks[nr * POTRUBI_COLS + c] |= dir === -1 ? S : N;
        r = nr;
        continue;
      }
    }
    masks[r * POTRUBI_COLS + c] |= E;
    masks[r * POTRUBI_COLS + c + 1] |= W;
    c++;
  }
  masks[r * POTRUBI_COLS + c] |= E; // out to the flat
  const endRow = r;

  // Fill the leftovers with decoys so the board isn't obviously empty.
  const decoys = [N | S, N | E, E | S, S | W, W | N, N | E | S];
  for (let i = 0; i < masks.length; i++) {
    if (masks[i] === 0) masks[i] = decoys[Math.floor(rand() * decoys.length)];
  }

  const cells = masks.map((mask) => {
    let m = mask;
    const turns = Math.floor(rand() * 4);
    for (let t = 0; t < turns; t++) m = rotate(m);
    return m;
  });

  return { cells, solution: masks, startRow, endRow };
}

/** Cells reachable from the meter, following matching pipe openings. */
export function flooded(cells: number[], startRow: number): Set<number> {
  const seen = new Set<number>();
  const startIdx = startRow * POTRUBI_COLS;
  if (!(cells[startIdx] & W)) return seen; // not even plugged into the meter
  const queue = [startIdx];
  seen.add(startIdx);
  while (queue.length) {
    const idx = queue.shift()!;
    const r = Math.floor(idx / POTRUBI_COLS);
    const c = idx % POTRUBI_COLS;
    for (const dir of [N, E, S, W]) {
      if (!(cells[idx] & dir)) continue;
      const [dr, dc] = DELTA[dir];
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= POTRUBI_ROWS || nc < 0 || nc >= POTRUBI_COLS) continue;
      const nIdx = nr * POTRUBI_COLS + nc;
      if (seen.has(nIdx)) continue;
      if (!(cells[nIdx] & OPPOSITE[dir])) continue; // the other end is closed
      seen.add(nIdx);
      queue.push(nIdx);
    }
  }
  return seen;
}

export function isSolved(cells: number[], startRow: number, endRow: number): boolean {
  const wet = flooded(cells, startRow);
  const endIdx = endRow * POTRUBI_COLS + (POTRUBI_COLS - 1);
  return wet.has(endIdx) && (cells[endIdx] & E) !== 0;
}
