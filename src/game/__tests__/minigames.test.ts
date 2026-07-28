// The four later diversions each pay in a different currency — that's the point
// of having them. These lock in what each one actually hands back.

import { afterEach, describe, expect, it } from 'vitest';
import { useGame } from '../store';
import { freshState } from './helpers';
import {
  burzaReward,
  BURZA_MAX_BONY,
  BURZA_START_CAPITAL,
  filozofReward,
  FILOZOF_MAX_REP,
  floorCost,
  jerabDiscount,
  JERAB_MAX_DISCOUNT,
  koncertBonus,
  KONCERT_MAX_HAPPINESS,
} from '../economy';
import { migrateSave, SAVE_VERSION } from '../state';
import type { GameState } from '../types';

function seed(game: GameState) {
  useGame.setState({ game, offlineSummary: null, helpOpen: false });
}

afterEach(() => {
  useGame.setState({ game: freshState(), offlineSummary: null, helpOpen: false });
});

describe('reward curves', () => {
  it('the crane pays a capped discount', () => {
    expect(jerabDiscount(0)).toBe(0);
    expect(jerabDiscount(5)).toBeGreaterThan(jerabDiscount(2));
    expect(jerabDiscount(999)).toBe(JERAB_MAX_DISCOUNT);
  });

  it('the burza pays nothing for a loss and is capped for a win', () => {
    expect(burzaReward(BURZA_START_CAPITAL)).toBe(0);
    expect(burzaReward(BURZA_START_CAPITAL - 500)).toBe(0);
    expect(burzaReward(BURZA_START_CAPITAL + 1_000_000)).toBe(BURZA_MAX_BONY);
  });

  it('the concert and the walk home are capped too', () => {
    expect(koncertBonus(0)).toBe(0);
    expect(koncertBonus(999)).toBe(KONCERT_MAX_HAPPINESS);
    expect(filozofReward(0)).toBe(0);
    expect(filozofReward(99999)).toBe(FILOZOF_MAX_REP);
  });
});

describe('rewardJerab', () => {
  it('banks a discount that the next floor actually spends', () => {
    const base = freshState();
    seed({ ...base, money: 1_000_000 });

    useGame.getState().rewardJerab(5); // 5 panels → 15 %
    const discount = useGame.getState().game.floorDiscount;
    expect(discount).toBeCloseTo(jerabDiscount(5), 5);

    const before = useGame.getState().game.money;
    const list = floorCost(base.buildings[0].floors, base.meta.perks.beton);
    useGame.getState().buyFloor(0);

    const after = useGame.getState().game;
    expect(after.buildings[0].floors).toBe(base.buildings[0].floors + 1);
    expect(before - after.money).toBe(Math.round(list * (1 - discount)));
    expect(after.floorDiscount).toBe(0); // spent, not kept
  });

  it('never banks past the cap', () => {
    seed({ ...freshState(), money: 0 });
    useGame.getState().rewardJerab(100);
    useGame.getState().rewardJerab(100);
    expect(useGame.getState().game.floorDiscount).toBe(JERAB_MAX_DISCOUNT);
  });
});

describe('rewardBurza', () => {
  it('pays bony, the currency nothing else hands out', () => {
    const base = freshState();
    seed({ ...base, bony: 0 });
    useGame.getState().rewardBurza(BURZA_START_CAPITAL + 1200);
    expect(useGame.getState().game.bony).toBe(burzaReward(BURZA_START_CAPITAL + 1200));
    expect(useGame.getState().game.bony).toBeGreaterThan(0);
  });

  it('pays nothing for a losing round', () => {
    seed({ ...freshState(), bony: 0 });
    useGame.getState().rewardBurza(BURZA_START_CAPITAL - 100);
    expect(useGame.getState().game.bony).toBe(0);
  });
});

describe('rewardKoncert', () => {
  it('lifts the whole house, not the fund', () => {
    const base = freshState();
    const tenant = base.buildings[0].flats[0].tenant!;
    seed(base);
    const moneyBefore = useGame.getState().game.money;

    useGame.getState().rewardKoncert(3);

    const g = useGame.getState().game;
    expect(g.buildings[0].flats[0].tenant!.happiness).toBeGreaterThan(tenant.happiness);
    expect(g.money).toBe(moneyBefore);
  });
});

describe('rewardFilozof', () => {
  it('pays in důvěra', () => {
    const base = freshState();
    seed({ ...base, reputation: 50 });
    useGame.getState().rewardFilozof(200); // 200 m → 5 rep
    expect(useGame.getState().game.reputation).toBe(50 + filozofReward(200));
  });

  it('cannot push reputation past 100', () => {
    seed({ ...freshState(), reputation: 99 });
    useGame.getState().rewardFilozof(100000);
    expect(useGame.getState().game.reputation).toBe(100);
  });
});

describe('migration v11', () => {
  it('adds the new diversions and the discount to an older save', () => {
    const old = freshState() as GameState & Record<string, unknown>;
    const legacy = { ...old, version: 10 } as Partial<GameState>;
    delete legacy.floorDiscount;
    legacy.minigames = { arkada: true, potrubi: true, azor: false } as GameState['minigames'];

    const migrated = migrateSave(legacy as GameState, 10);

    expect(migrated.floorDiscount).toBe(0);
    expect(migrated.minigames.potrubi).toBe(true); // kept what was already bought
    expect(migrated.minigames.jerab).toBe(false);
    expect(migrated.minigames.filozof).toBe(false);
    expect(migrated.version).toBe(SAVE_VERSION);
  });
});
