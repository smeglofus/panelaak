// The one thing this puzzle must never do is hand the player a board that
// cannot be solved. Generation lays a real path first and only then scrambles
// the orientations, so the solution is always exactly "turn everything back".

import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { flooded, generate, isSolved, rotate, N, E, S, W } from '../potrubi';

describe('rotate', () => {
  it('turns a piece a quarter at a time and comes full circle', () => {
    expect(rotate(N)).toBe(E);
    expect(rotate(E)).toBe(S);
    expect(rotate(S)).toBe(W);
    expect(rotate(W)).toBe(N);
    expect(rotate(rotate(rotate(rotate(N | E))))).toBe(N | E);
  });
});

describe('generate', () => {
  it('always lays a solvable board', () => {
    // Deterministic sweep — a stuck generator would show up as a failing seed.
    for (let seed = 1; seed <= 300; seed++) {
      const rng = createRng(seed);
      const b = generate(() => rng.next());
      expect(isSolved(b.solution, b.startRow, b.endRow)).toBe(true);
    }
  });

  it('scrambles the board it shows the player', () => {
    // Over many boards at least some pieces must differ from the solution,
    // otherwise the puzzle would already be finished on screen.
    let scrambledBoards = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const rng = createRng(seed);
      const b = generate(() => rng.next());
      if (b.cells.some((c, i) => c !== b.solution[i])) scrambledBoards++;
    }
    expect(scrambledBoards).toBeGreaterThan(40);
  });

  it('feeds from the meter and leaves toward the flat', () => {
    const rng = createRng(7);
    const b = generate(() => rng.next());
    expect(b.solution[b.startRow * 5] & W).toBeTruthy();
    expect(b.solution[b.endRow * 5 + 4] & E).toBeTruthy();
  });
});

describe('flooded', () => {
  it('stops at a piece whose facing side is closed', () => {
    // A lone straight pipe fed from the left: water reaches it, goes no further.
    const cells = Array<number>(25).fill(0);
    cells[0] = E | W; // row 0, col 0 — open to the meter and to the right
    cells[1] = N | S; // the neighbour's west side is shut
    const wet = flooded(cells, 0);
    expect(wet.has(0)).toBe(true);
    expect(wet.has(1)).toBe(false);
  });

  it('reports nothing when the first piece is not plugged into the meter', () => {
    const cells = Array<number>(25).fill(N | S);
    expect(flooded(cells, 0).size).toBe(0);
  });
});
