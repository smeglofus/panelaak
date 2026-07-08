import { describe, expect, it } from 'vitest';
import { tick } from '../tick';
import { EVENTS } from '../events';
import { applyPrestige } from '../prestige';
import { createRng } from '../rng';
import { incomePerSec, SITES, UDERNIK_CLICKS } from '../economy';
import { migrateSave } from '../state';
import type { GameState } from '../types';
import { freshState, makeTenant, withFloors, withSecondBuilding, withTenant } from './helpers';

const def = (id: string) => EVENTS.find((e) => e.id === id)!;

function withTenantIn(s: GameState, flatIndex: number, overrides = {}): GameState {
  const buildings = s.buildings.map((b) => ({
    ...b,
    flats: b.flats.map((f) =>
      f.index === flatIndex ? { ...f, tenant: makeTenant({ id: 500 + flatIndex, ...overrides }) } : f,
    ),
  }));
  return { ...s, buildings };
}

describe('sídliště: sites', () => {
  it('U Fabriky pays more rent, U Lesa slightly less', () => {
    let s = withFloors(freshState(), 1);
    s = withTenant(s, 0, { happiness: 80 });
    const base = incomePerSec(s);

    const fabrika = { ...s, buildings: [{ ...s.buildings[0], site: 1 }] };
    expect(incomePerSec(fabrika)).toBeCloseTo(base * SITES[1].rentMult, 5);

    const les = { ...s, buildings: [{ ...s.buildings[0], site: 2 }] };
    expect(incomePerSec(les)).toBeCloseTo(base * SITES[2].rentMult, 5);
  });

  it('mejdan hits only the drunk’s own building', () => {
    let s = withFloors(freshState(), 1);
    s = withTenant(s, 0, { archetype: 'drunk', happiness: 50 });
    s = withSecondBuilding(s, 1, 1); // flats 2,3 in building 1, floor 1
    s = withTenantIn(s, 2, { archetype: 'shift', happiness: 60 });

    const next = def('mejdan').apply(s, createRng(1));
    const flats = next.buildings.flatMap((b) => b.flats);
    expect(flats.find((f) => f.index === 0)!.tenant!.happiness).toBeLessThan(50);
    expect(flats.find((f) => f.index === 2)!.tenant!.happiness).toBe(60); // jiný dům spí
  });

  it('a second building earns rent too', () => {
    let s = withFloors(freshState(), 1);
    s = withTenant(s, 0, { happiness: 80 });
    const single = incomePerSec(s);
    let dvojice = withSecondBuilding(s, 1, 1);
    dvojice = withTenantIn(dvojice, 2, { happiness: 80 });
    expect(incomePerSec(dvojice)).toBeGreaterThan(single);
  });
});

describe('kádrový posudek', () => {
  it('úderník badge fires at 250 clicks and pays a kupón', () => {
    let s = freshState();
    s = { ...s, stats: { ...s.stats, brigadeClicks: UDERNIK_CLICKS } };
    const next = tick(s);
    expect(next.meta.badges.udernik).toBe(true);
    expect(next.meta.kupony).toBe(s.meta.kupony + 1);
    expect(next.log.some((e) => e.text.includes('ÚDERNÍK'))).toBe(true);
  });

  it('badges survive privatizace', () => {
    let s = freshState();
    s = {
      ...s,
      tick: (270 + 360) * 30, // rok 1990
      totalEarned: 50000,
      meta: { ...s.meta, badges: { ...s.meta.badges, udernik: true } },
    };
    const next = applyPrestige(s, 42);
    expect(next.meta.badges.udernik).toBe(true);
    // …a kapitalista badge arrives on the first tick of the new era
    const ticked = tick(next);
    expect(ticked.meta.badges.kapitalista).toBe(true);
  });
});

describe('migration v6', () => {
  it('adds site/bldg/badges/stats to an old save', () => {
    const old = freshState() as GameState & Record<string, unknown>;
    const legacy: GameState = {
      ...old,
      version: 5,
      meta: { prestigeLevel: 1, kupony: 3, perks: old.meta.perks } as GameState['meta'],
      stats: { moveIns: 1, moveOuts: 0, eventsFired: 2, breakdowns: 0 } as GameState['stats'],
      buildings: old.buildings.map((b) => {
        const rest = { ...b } as Partial<typeof b>;
        delete rest.site;
        return {
          ...rest,
          flats: b.flats.map((f) => {
            const fr = { ...f } as Partial<typeof f>;
            delete fr.bldg;
            return fr;
          }),
        };
      }) as GameState['buildings'],
    };
    const migrated = migrateSave(legacy, 5);
    expect(migrated.buildings[0].site).toBe(0);
    expect(migrated.buildings[0].flats[0].bldg).toBe(0);
    expect(migrated.meta.badges.udernik).toBe(false);
    expect(migrated.meta.kupony).toBe(3);
    expect(migrated.stats.brigadeClicks).toBe(0);
    expect(migrated.version).toBe(6);
  });
});
