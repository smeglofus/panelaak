import { describe, expect, it } from 'vitest';
import { happinessTarget, tick } from '../tick';
import { resolveChoice } from '../events';
import {
  BRIGADE_ENERGY_COST,
  BRIGADE_ENERGY_MAX,
  brigadeReward,
  incomePerSec,
  MILESTONE_REWARDS,
  rentPerSec,
} from '../economy';
import { ARCHETYPES } from '../tenants';
import { applyBrigadeWork, migrateSave, SAVE_VERSION } from '../state';
import type { GameState } from '../types';
import { deepFreeze, freshState, withFloors, withTenant } from './helpers';

function runTicks(s: GameState, n: number): GameState {
  for (let i = 0; i < n; i++) {
    s = tick(s);
    // Choice modals pause the game — auto-resolve them in tests.
    if (s.pendingChoice) s = resolveChoice(s, 'skip');
  }
  return s;
}

describe('rent accrual', () => {
  it('adds rent for the occupied flat on each tick', () => {
    const s = freshState();
    const tenant = s.buildings[0].flats[0].tenant!;
    expect(tenant.archetype).toBe('shift');
    // Tenant sits exactly at the happiness target (70), so no drift this tick.
    const expected = rentPerSec(ARCHETYPES.shift.rentMult, tenant.happiness);
    const next = tick(s);
    expect(next.money).toBeCloseTo(s.money + expected, 5);
    expect(next.totalEarned).toBeCloseTo(expected, 5);
  });

  it('still trickles income at zero happiness — no dead state', () => {
    let s = withFloors(freshState(), 1);
    s = withTenant(s, 0, { happiness: 0 });
    s = { ...s, money: 0 };
    // Stay under the event grace period so nothing can charge money.
    const after = runTicks(s, 40);
    expect(after.money).toBeGreaterThan(0);
    expect(after.totalEarned).toBeGreaterThan(40 * 0.2 * ARCHETYPES.shift.rentMult * 0.9);
  });
});

describe('happiness', () => {
  it('drifts up toward the building-condition target', () => {
    const s = withTenant(freshState(), 1, { happiness: 20 });
    const next = tick(s);
    expect(next.buildings[0].flats[1].tenant!.happiness).toBeGreaterThan(20);
  });

  it('drifts down while hot water is out', () => {
    let s = withTenant(freshState(), 1, { happiness: 90 });
    s = { ...s, activeEvents: [{ id: 'hotWater', remaining: 120 }] };
    const next = tick(s);
    expect(next.buildings[0].flats[1].tenant!.happiness).toBeLessThan(90);
  });

  it('decays much faster on floors 3+ when the elevator is broken', () => {
    const base = withTenant(withFloors(freshState(), 3), 4, { happiness: 80 }); // flat 4 = floor 3
    const broken: GameState = {
      ...base,
      buildings: [{ ...base.buildings[0], elevatorBroken: true }],
    };
    const dropNormal = 80 - tick(base).buildings[0].flats[4].tenant!.happiness;
    const dropBroken = 80 - tick(broken).buildings[0].flats[4].tenant!.happiness;
    expect(dropBroken).toBeGreaterThan(dropNormal * 3);
  });
});

describe('move-outs', () => {
  it('evicts a tenant after 60 s under 20 % happiness', () => {
    let s = withFloors(freshState(), 1);
    s = withTenant(s, 0, { archetype: 'couple', happiness: 5, unhappySince: 0 });
    s = { ...s, tick: 100 };
    const next = tick(s);
    expect(next.stats.moveOuts).toBe(1);
    expect(next.reputation).toBeLessThan(s.reputation);
    expect(next.log.some((e) => e.kind === 'bad' && e.text.includes('vrací klíče'))).toBe(true);
  });

  it('paní Vlasta (pensioner) never moves out', () => {
    let s = withFloors(freshState(), 1);
    s = withTenant(s, 0, { archetype: 'pensioner', happiness: 5, unhappySince: 0 });
    s = { ...s, tick: 100 };
    const next = tick(s);
    expect(next.stats.moveOuts).toBe(0);
    expect(next.buildings[0].flats[0].tenant).not.toBeNull();
  });
});

describe('a 10-minute idle session (600 ticks)', () => {
  const final = runTicks(freshState(7), 600);

  it('produces at least one move-in', () => {
    expect(final.stats.moveIns).toBeGreaterThanOrEqual(1);
  });

  it('produces at least one breakdown and some events (DoD §11)', () => {
    expect(final.stats.breakdowns).toBeGreaterThanOrEqual(1);
    expect(final.stats.eventsFired).toBeGreaterThanOrEqual(1);
  });

  it('advances the clock without losing ticks', () => {
    expect(final.tick).toBe(600);
  });
});

describe('determinism & purity', () => {
  it('same seed → identical run', () => {
    const run = () => {
      let s: GameState = { ...freshState(123), lastSaved: 0 };
      s = runTicks(s, 300);
      return JSON.stringify(s);
    };
    expect(run()).toBe(run());
  });

  it('tick() does not mutate its input', () => {
    const s = deepFreeze(freshState());
    expect(() => tick(s)).not.toThrow();
  });

  it('tick() is a no-op while a choice modal is open', () => {
    const s = { ...freshState(), pendingChoice: { eventId: 'schuze', title: '', body: '', options: [] } };
    expect(tick(s)).toBe(s);
  });
});

describe('Akce Z (brigade work)', () => {
  it('earns money and drains elán', () => {
    const s = freshState();
    const next = applyBrigadeWork(s);
    expect(next.money).toBe(s.money + brigadeReward(1));
    expect(next.energy).toBe(s.energy - BRIGADE_ENERGY_COST);
    expect(next.totalEarned).toBe(s.totalEarned + brigadeReward(1));
  });

  it('does nothing when out of elán', () => {
    const s = { ...freshState(), energy: BRIGADE_ENERGY_COST - 1 };
    expect(applyBrigadeWork(s)).toBe(s);
  });

  it('elán regenerates each tick up to the cap', () => {
    const tired = { ...freshState(), energy: 0 };
    expect(tick(tired).energy).toBeGreaterThan(0);
    const rested = freshState();
    expect(tick(rested).energy).toBe(BRIGADE_ENERGY_MAX);
  });

  it('reward scales with building size', () => {
    expect(brigadeReward(8)).toBeGreaterThan(brigadeReward(1));
  });
});

describe('domovník pan Fanda', () => {
  it('fixes a broken elevator eventually and pays from the fund', () => {
    let s = withTenant(withFloors(freshState(), 3), 0, { happiness: 80 });
    s = {
      ...s,
      money: 5000,
      caretakerHired: true,
      buildings: [{ ...s.buildings[0], elevatorBroken: true }],
    };
    const after = runTicks(s, 120);
    expect(after.buildings[0].elevatorBroken).toBe(false);
    expect(after.log.some((e) => e.text.includes('Fanda opravil výtah'))).toBe(true);
  });

  it('takes a wage every tick', () => {
    let s = withFloors(freshState(), 3);
    s = {
      ...s,
      money: 1000,
      caretakerHired: true,
      // Pre-claim the milestone so its cash reward doesn't mask the wage.
      milestones: { ...s.milestones, elevatorInstalled: true },
    };
    const next = tick(s);
    // No tenants → no rent; only the wage leaves the fund.
    expect(next.money).toBeLessThan(1000);
  });

  it('does not repair when the fund is empty', () => {
    let s = withFloors(freshState(), 3);
    s = {
      ...s,
      money: 0,
      caretakerHired: true,
      milestones: { ...s.milestones, elevatorInstalled: true },
      buildings: [{ ...s.buildings[0], elevatorBroken: true }],
    };
    const after = runTicks(s, 60);
    expect(after.buildings[0].elevatorBroken).toBe(true);
  });
});

describe('archetype quirks & courtyard', () => {
  it('kutil fixes a leak for free over time', () => {
    let s = withFloors(freshState(), 1);
    s = withTenant(s, 0, { archetype: 'kutil', happiness: 80 });
    const b = s.buildings[0];
    s = {
      ...s,
      buildings: [
        { ...b, flats: b.flats.map((f) => (f.index === 0 ? { ...f, problem: 'leak' as const } : f)) },
      ],
    };
    const after = runTicks(s, 600);
    expect(after.log.some((e) => e.text.includes('Jarda'))).toBe(true);
  });

  it('disident pays the loyalty reputation bonus after 30 minutes', () => {
    let s = withFloors(freshState(), 1);
    s = withTenant(s, 0, { archetype: 'disident', happiness: 80, movedInAt: 0 });
    s = { ...s, tick: 1800 };
    const next = tick(s);
    expect(next.reputation).toBeGreaterThan(s.reputation);
    expect(next.buildings[0].flats[0].tenant!.quirkDone).toBe(true);
    // …and only once.
    const again = tick(next);
    expect(again.reputation).toBeLessThanOrEqual(next.reputation + 1); // move-in rep at most
  });

  it('family suffers extra without hot water; sandbox helps them', () => {
    let s = withFloors(freshState(), 1);
    s = withTenant(s, 0, { archetype: 'family' });
    const flat = s.buildings[0].flats[0];

    const withOutage = { ...s, activeEvents: [{ id: 'hotWater', remaining: 60 }] };
    const shiftOutage = withTenant(withOutage, 0, { archetype: 'shift' });
    expect(happinessTarget(withOutage, withOutage.buildings[0].flats[0])).toBeLessThan(
      happinessTarget(shiftOutage, shiftOutage.buildings[0].flats[0]),
    );

    const withSandbox = { ...s, courtyard: { ...s.courtyard, piskoviste: true } };
    expect(happinessTarget(withSandbox, flat)).toBeGreaterThan(happinessTarget(s, flat));
  });

  it('garage makes the vekslák pay more', () => {
    let s = withFloors(freshState(), 1);
    s = withTenant(s, 0, { archetype: 'vekslak', happiness: 80 });
    const base = incomePerSec(s);
    const withGarage = { ...s, courtyard: { ...s.courtyard, garaz: true } };
    expect(incomePerSec(withGarage)).toBeCloseTo(base * 1.2, 5);
  });
});

describe('výpověď (eviction)', () => {
  it('completes the řízení and vacates the flat', () => {
    let s = withFloors(freshState(), 1);
    s = withTenant(s, 0, { archetype: 'drunk', happiness: 80, evictionAt: 100 });
    s = { ...s, tick: 99 };
    const next = tick(s);
    expect(next.stats.moveOuts).toBe(1);
    expect(next.log.some((e) => e.text.includes('úředně'))).toBe(true);
  });

  it('does nothing before the deadline', () => {
    let s = withFloors(freshState(), 1);
    s = withTenant(s, 0, { archetype: 'drunk', happiness: 80, evictionAt: 500 });
    s = { ...s, tick: 100 };
    const next = tick(s);
    expect(next.buildings[0].flats[0].tenant).not.toBeNull();
  });
});

describe('kalendář ve hře', () => {
  const WINTER_TICK = 240 * 30; // 1. prosince 1983

  it('winter drains heating money', () => {
    let s = withFloors(freshState(), 2);
    s = { ...s, tick: WINTER_TICK, money: 100 };
    const next = tick(s);
    expect(next.money).toBeLessThan(100);
  });

  it('no heating outside the season', () => {
    let s = withFloors(freshState(), 2);
    s = { ...s, tick: 10, money: 100 }; // duben, pod grace eventů
    const next = tick(s);
    expect(next.money).toBe(100);
  });

  it('winter lowers the happiness target', () => {
    const s = withTenant(withFloors(freshState(), 1), 0, { happiness: 70 });
    const summer = { ...s, tick: 90 * 30 };
    const winter = { ...s, tick: WINTER_TICK };
    const flat = (st: GameState) => st.buildings[0].flats[0];
    expect(happinessTarget(winter, flat(winter))).toBeLessThan(
      happinessTarget(summer, flat(summer)),
    );
  });

  it('the planned July outage arrives. Plán je plán.', () => {
    let s = withTenant(withFloors(freshState(), 1), 0, { happiness: 80 });
    s = { ...s, tick: 90 * 30 - 1 }; // vteřinu před 1. červencem
    const next = tick(s);
    expect(next.activeEvents.some((e) => e.id === 'hotWater')).toBe(true);
    expect(next.log.some((e) => e.text.includes('Plánovaná odstávka'))).toBe(true);
  });

  it('Christmas sweetens the whole house', () => {
    let s = withTenant(withFloors(freshState(), 1), 0, { happiness: 50 });
    s = { ...s, tick: 263 * 30 - 1 }; // vteřinu před Štědrým dnem
    const next = tick(s);
    expect(next.buildings[0].flats[0].tenant!.happiness).toBeGreaterThan(60);
    expect(next.log.some((e) => e.text.includes('Štědrý den'))).toBe(true);
  });

  it('1. máj opens the decoration choice', () => {
    let s = withTenant(withFloors(freshState(), 1), 0, { happiness: 80 });
    s = { ...s, tick: 30 * 30 - 1 }; // vteřinu před 1. májem
    const next = tick(s);
    expect(next.pendingChoice?.eventId).toBe('prvnimaj');
  });
});

describe('bony & Tuzex', () => {
  it('vekslák leaves envelopes over time', () => {
    let s = withFloors(freshState(), 1);
    s = withTenant(s, 0, { archetype: 'vekslak', happiness: 90 });
    const after = runTicks(s, 1200);
    expect(after.bony).toBeGreaterThanOrEqual(1);
  });

  it('color TV raises the happiness target for everyone', () => {
    const s = withTenant(withFloors(freshState(), 1), 0, { happiness: 70 });
    const withTv = { ...s, tuzex: { ...s.tuzex, tv: true } };
    const flat = s.buildings[0].flats[0];
    expect(happinessTarget(withTv, flat)).toBeGreaterThan(happinessTarget(s, flat));
  });

  it('western washing machine speeds up the laundry regen', () => {
    let base = withTenant(withFloors(freshState(), 1), 0, { happiness: 20 });
    base = { ...base, tick: 10, upgrades: { ...base.upgrades, laundry: true } };
    const west = { ...base, tuzex: { ...base.tuzex, pracka: true } };
    const gain = (st: GameState) => tick(st).buildings[0].flats[0].tenant!.happiness - 20;
    expect(gain(west)).toBeGreaterThan(gain(base));
  });
});

describe('save migration', () => {
  it('fills v2 + v3 + v4 fields into a v1 save', () => {
    const v1: Partial<GameState> = { ...freshState(), version: 1 };
    delete v1.energy;
    delete v1.courtyard;
    delete v1.caretakerHired;
    delete v1.bony;
    delete v1.tuzex;
    delete v1.repeatables;
    v1.meta = { prestigeLevel: 0 } as GameState['meta'];
    const migrated = migrateSave(v1 as GameState, 1);
    expect(migrated.energy).toBe(BRIGADE_ENERGY_MAX);
    expect(migrated.courtyard.piskoviste).toBe(false);
    expect(migrated.caretakerHired).toBe(false);
    expect(migrated.bony).toBe(0);
    expect(migrated.tuzex.tv).toBe(false);
    expect(migrated.meta.kupony).toBe(0);
    expect(migrated.meta.perks.beton).toBe(0);
    expect(migrated.repeatables.renovace).toBe(0);
    expect(migrated.buildings[0].flats[0].tenant!.movedInAt).toBe(0);
    expect(migrated.buildings[0].flats[0].tenant!.quirkDone).toBe(false);
    expect(migrated.buildings[0].flats[0].tenant!.evictionAt).toBeNull();
    expect(migrated.version).toBe(SAVE_VERSION);
  });

  it('leaves a current save untouched', () => {
    const s = freshState();
    expect(migrateSave(s, SAVE_VERSION)).toBe(s);
  });
});

describe('milestones', () => {
  it('fires first1000 when total earnings cross 1 000 Kčs and pays the OPBH reward', () => {
    const s = { ...freshState(), totalEarned: 999.9 };
    const next = tick(s);
    expect(next.milestones.first1000).toBe(true);
    expect(next.log.some((e) => e.kind === 'milestone')).toBe(true);
    expect(next.money).toBeGreaterThanOrEqual(s.money + MILESTONE_REWARDS.first1000);
  });

  it('fires firstFullFloor when a floor fills up', () => {
    const s = withTenant(freshState(), 1, { happiness: 70 });
    const next = tick(s);
    expect(next.milestones.firstFullFloor).toBe(true);
  });
});
