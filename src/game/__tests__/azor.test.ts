// A courtyard with a walled-off corner would hide a cat where Azor can never
// reach it, and the round would never end. Check every maze up front.

import { describe, expect, it } from 'vitest';
import {
  AZOR_COLS,
  AZOR_MAX_CATS,
  AZOR_MAX_VB,
  AZOR_MIN_STEP_MS,
  AZOR_ROWS,
  MAZES,
  mazeForRound,
  openTiles,
  reachable,
  roundSetup,
} from '../azor';

describe('mazes', () => {
  it('are all the same rectangle', () => {
    for (const maze of MAZES) {
      expect(maze).toHaveLength(AZOR_ROWS);
      for (const row of maze) expect(row).toHaveLength(AZOR_COLS);
    }
  });

  it('are walled all the way round', () => {
    for (const maze of MAZES) {
      expect(maze[0]).toMatch(/^#+$/);
      expect(maze[AZOR_ROWS - 1]).toMatch(/^#+$/);
      for (const row of maze) {
        expect(row[0]).toBe('#');
        expect(row[AZOR_COLS - 1]).toBe('#');
      }
    }
  });

  it('have every open tile reachable from every other', () => {
    for (const [i, maze] of MAZES.entries()) {
      const tiles = openTiles(maze);
      expect(tiles.length).toBeGreaterThan(20);
      const seen = reachable(maze, tiles[0]);
      expect(seen.size, `maze ${i} has an unreachable pocket`).toBe(tiles.length);
    }
  });

  it('cycles through the courtyards as rounds go by', () => {
    expect(mazeForRound(1)).toBe(MAZES[0]);
    expect(mazeForRound(2)).toBe(MAZES[1]);
    expect(mazeForRound(MAZES.length + 1)).toBe(MAZES[0]);
  });
});

describe('roundSetup', () => {
  it('starts gently', () => {
    const first = roundSetup(1);
    expect(first.cats).toBe(5);
    expect(first.vb).toBe(2);
  });

  it('gets busier and quicker each round', () => {
    const a = roundSetup(1);
    const b = roundSetup(4);
    expect(b.cats).toBeGreaterThan(a.cats);
    expect(b.vb).toBeGreaterThanOrEqual(a.vb);
    expect(b.stepMs).toBeLessThan(a.stepMs);
  });

  it('stops short of impossible', () => {
    const late = roundSetup(50);
    expect(late.cats).toBe(AZOR_MAX_CATS);
    expect(late.vb).toBe(AZOR_MAX_VB);
    expect(late.stepMs).toBe(AZOR_MIN_STEP_MS);
  });

  it('never asks for more cats than there are tiles to hide on', () => {
    for (let round = 1; round <= 30; round++) {
      const s = roundSetup(round);
      const tiles = openTiles(mazeForRound(round)).length;
      expect(s.cats + s.vb + 1).toBeLessThan(tiles);
    }
  });
});
