import { describe, expect, it } from 'vitest';
import {
  applyPrestige,
  buyPerk,
  computeKupony,
  privatizaceAvailable,
  privatizaceRumoured,
} from '../prestige';
import {
  brigadeReward,
  fineMult,
  floorCost,
  incomePerSec,
  PERK_MAX,
  repeatableCost,
} from '../economy';
import { SECONDS_PER_DAY } from '../calendar';
import { freshState, withFloors, withTenant } from './helpers';

// 1.4.1988 + 270 days = 1.1.1989; + 360 more = 1.1.1990.
const TICK_1990 = (270 + 360) * SECONDS_PER_DAY;

describe('privatizace availability', () => {
  it('is locked at the start and rumoured in 1989', () => {
    const s = freshState();
    expect(privatizaceAvailable(s)).toBe(false);
    expect(privatizaceRumoured({ ...s, tick: 270 * SECONDS_PER_DAY })).toBe(true);
    expect(privatizaceAvailable({ ...s, tick: 270 * SECONDS_PER_DAY })).toBe(false);
  });

  it('unlocks on 1. ledna 1990', () => {
    expect(privatizaceAvailable({ ...freshState(), tick: TICK_1990 })).toBe(true);
  });
});

describe('kupóny', () => {
  it('grow with lifetime earnings and the Vzorný dům title', () => {
    const s = { ...freshState(), totalEarned: 50000 };
    expect(computeKupony(s)).toBe(10);
    const titled = { ...s, milestones: { ...s.milestones, vzornyDum: true } };
    expect(computeKupony(titled)).toBe(15);
  });
});

describe('applyPrestige', () => {
  const before = {
    ...freshState(),
    tick: TICK_1990,
    totalEarned: 50000,
    money: 99999,
  };

  it('resets the world but carries and grows the meta', () => {
    const after = applyPrestige(before, 42);
    expect(after.meta.prestigeLevel).toBe(1);
    expect(after.meta.kupony).toBe(10);
    expect(after.tick).toBe(0);
    expect(after.buildings[0].floors).toBe(1);
    expect(after.totalEarned).toBe(0);
    expect(after.log.some((e) => e.kind === 'milestone')).toBe(true);
  });

  it('each éra pays a permanent rent bonus', () => {
    let s = withTenant(withFloors(freshState(), 1), 0, { happiness: 80 });
    const base = incomePerSec(s);
    s = { ...s, meta: { ...s.meta, prestigeLevel: 2 } };
    expect(incomePerSec(s)).toBeCloseTo(base * 1.1, 5);
  });

  it('stříbro and pověst perks improve the next start', () => {
    const withPerks = {
      ...before,
      meta: { ...before.meta, perks: { ...before.meta.perks, stribro: 2, povest: 1 } },
    };
    const plain = applyPrestige(before, 42);
    const boosted = applyPrestige(withPerks, 42);
    expect(boosted.money).toBe(plain.money + 1000);
    expect(boosted.reputation).toBe(plain.reputation + 5);
  });
});

describe('perky', () => {
  it('buyPerk spends kupóny and respects the max level', () => {
    let s = freshState();
    s = { ...s, meta: { ...s.meta, kupony: 100, perks: { ...s.meta.perks, konexe: 0 } } };
    const bought = buyPerk(s, 'konexe');
    expect(bought.meta.perks.konexe).toBe(1);
    expect(bought.meta.kupony).toBe(97);

    let maxed = { ...s, meta: { ...s.meta, kupony: 100 } };
    maxed = {
      ...maxed,
      meta: { ...maxed.meta, perks: { ...maxed.meta.perks, konexe: PERK_MAX.konexe } },
    };
    expect(buyPerk(maxed, 'konexe')).toBe(maxed);
  });

  it('beton makes floors cheaper, konexe softens fines, ručičky boost Akce Z', () => {
    expect(floorCost(1, 5)).toBeLessThan(floorCost(1));
    const s = freshState();
    const connected = {
      ...s,
      meta: { ...s.meta, perks: { ...s.meta.perks, konexe: 3 } },
    };
    expect(fineMult(connected)).toBeCloseTo(0.7);
    expect(brigadeReward(1, 0, 2)).toBe(brigadeReward(1) + 6);
  });
});

describe('repeatable upgrades', () => {
  it('cost escalates with each level', () => {
    expect(repeatableCost('renovace', 0)).toBe(1200);
    expect(repeatableCost('renovace', 1)).toBeGreaterThan(repeatableCost('renovace', 0));
    expect(repeatableCost('naradi', 3)).toBeGreaterThan(repeatableCost('naradi', 2));
  });

  it('renovace raises income, nářadí raises the click reward', () => {
    let s = withTenant(withFloors(freshState(), 1), 0, { happiness: 80 });
    const base = incomePerSec(s);
    s = { ...s, repeatables: { ...s.repeatables, renovace: 4 } };
    expect(incomePerSec(s)).toBeCloseTo(base * 1.2, 5);
    expect(brigadeReward(1, 3)).toBe(brigadeReward(1) + 6);
  });
});
