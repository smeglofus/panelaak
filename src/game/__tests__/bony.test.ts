// The bony sink: three one-off goods used to be everything bony bought, while
// a mid-game house earns tens of them an hour. These are the sinks that fixed it.

import { afterEach, describe, expect, it } from 'vitest';
import { useGame } from '../store';
import { freshState } from './helpers';
import {
  BONY_PER_KUPON,
  incomePerSec,
  MINIGAME_COSTS,
  potrubiReward,
  POTRUBI_MIN_REWARD,
  tuzexBalikCost,
  TUZEX_BALIK_RENT_BONUS,
} from '../economy';
import { migrateSave, SAVE_VERSION } from '../state';
import type { GameState } from '../types';

function seed(game: GameState) {
  useGame.setState({ game, offlineSummary: null, helpOpen: false });
}

afterEach(() => {
  useGame.setState({ game: freshState(), offlineSummary: null, helpOpen: false });
});

describe('tuzexBalikCost', () => {
  it('gets steadily more expensive, so it never stops being a sink', () => {
    expect(tuzexBalikCost(0)).toBe(3);
    expect(tuzexBalikCost(1)).toBeGreaterThan(tuzexBalikCost(0));
    expect(tuzexBalikCost(10)).toBeGreaterThan(tuzexBalikCost(5));
  });
});

describe('buyBalik', () => {
  it('charges bony and raises rent for good', () => {
    const base = freshState();
    seed({ ...base, bony: 50 });
    const before = incomePerSec(useGame.getState().game);

    useGame.getState().buyBalik();

    const g = useGame.getState().game;
    expect(g.baliky).toBe(1);
    expect(g.bony).toBe(50 - tuzexBalikCost(0));
    expect(incomePerSec(g)).toBeCloseTo(before * (1 + TUZEX_BALIK_RENT_BONUS), 5);
  });

  it('refuses when the bony are not there', () => {
    seed({ ...freshState(), bony: 0 });
    useGame.getState().buyBalik();
    expect(useGame.getState().game.baliky).toBe(0);
  });
});

describe('exchangeBonyForKupon', () => {
  it('trades a pile of bony for a single kupón', () => {
    const base = freshState();
    seed({ ...base, bony: BONY_PER_KUPON });
    useGame.getState().exchangeBonyForKupon();
    const g = useGame.getState().game;
    expect(g.bony).toBe(0);
    expect(g.meta.kupony).toBe(base.meta.kupony + 1);
  });

  it('refuses below the rate', () => {
    seed({ ...freshState(), bony: BONY_PER_KUPON - 1 });
    useGame.getState().exchangeBonyForKupon();
    expect(useGame.getState().game.meta.kupony).toBe(0);
  });
});

describe('unlockMinigame', () => {
  it('buys a diversion once and does not charge twice', () => {
    seed({ ...freshState(), bony: 40 });
    useGame.getState().unlockMinigame('potrubi');
    expect(useGame.getState().game.minigames.potrubi).toBe(true);
    const after = useGame.getState().game.bony;
    useGame.getState().unlockMinigame('potrubi'); // already owned
    expect(useGame.getState().game.bony).toBe(after);
  });

  it('refuses without the bony', () => {
    seed({ ...freshState(), bony: MINIGAME_COSTS.azor - 1 });
    useGame.getState().unlockMinigame('azor');
    expect(useGame.getState().game.minigames.azor).toBe(false);
  });
});

describe('potrubiReward', () => {
  it('pays more for a tidy solve but never nothing', () => {
    expect(potrubiReward(0)).toBeGreaterThan(potrubiReward(10));
    expect(potrubiReward(1000)).toBe(POTRUBI_MIN_REWARD);
  });
});

describe('rewardPotrubi', () => {
  it('fixes a real leak on the way out', () => {
    const base = freshState();
    const withLeak: GameState = {
      ...base,
      buildings: base.buildings.map((b, i) =>
        i === 0
          ? { ...b, flats: b.flats.map((f, j) => (j === 0 ? { ...f, problem: 'leak' as const } : f)) }
          : b,
      ),
    };
    seed(withLeak);

    const flat = useGame.getState().rewardPotrubi(3);

    expect(flat).not.toBeNull();
    expect(useGame.getState().game.buildings[0].flats[0].problem).toBeNull();
  });

  it('still pays when nothing is broken', () => {
    const base = freshState();
    seed({ ...base, money: 0 });
    expect(useGame.getState().rewardPotrubi(2)).toBeNull();
    expect(useGame.getState().game.money).toBeGreaterThan(0);
  });
});

describe('migration v10', () => {
  it('gives an old save the new fields and keeps its arcade', () => {
    const old = freshState() as GameState & Record<string, unknown>;
    const legacy = { ...old, version: 9 } as Partial<GameState>;
    delete legacy.baliky;
    delete legacy.minigames;

    const migrated = migrateSave(legacy as GameState, 9);

    expect(migrated.baliky).toBe(0);
    expect(migrated.minigames.arkada).toBe(true); // came with the house
    expect(migrated.minigames.potrubi).toBe(false);
    expect(migrated.version).toBe(SAVE_VERSION);
  });
});
