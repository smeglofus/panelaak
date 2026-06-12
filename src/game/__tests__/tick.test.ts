import { describe, expect, it } from 'vitest';
import { tick } from '../tick';
import { resolveSchuze } from '../events';
import {
  BRIGADE_ENERGY_COST,
  BRIGADE_ENERGY_MAX,
  brigadeReward,
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
    // The schůze modal pauses the game — auto-resolve it in tests.
    if (s.pendingChoice) s = resolveSchuze(s, 'skip');
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

describe('save migration', () => {
  it('fills the v2 energy field into a v1 save', () => {
    const v1: Partial<GameState> = { ...freshState(), version: 1 };
    delete v1.energy;
    const migrated = migrateSave(v1 as GameState, 1);
    expect(migrated.energy).toBe(BRIGADE_ENERGY_MAX);
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
