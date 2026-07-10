import { describe, expect, it } from 'vitest';
import { tick } from '../tick';
import { describePlan, PLAN_DEFS, processPlan } from '../plans';
import { createRng } from '../rng';
import type { ActivePlan, GameState } from '../types';
import {
  flatRenoCost,
  FLAT_RENO_MAX,
  incomePerSec,
  KULTURAK_BON_INTERVAL,
  PLAN_FIRST_AT,
  SKOLKA_MOVE_IN_MULT,
} from '../economy';
import { happinessTarget } from '../tick';
import { freshState, withFloors, withTenant } from './helpers';

function brigadePlan(s: GameState): ActivePlan {
  return {
    id: 'brigade',
    target: 5,
    baseline: s.stats.brigadeClicks,
    progress: 0,
    deadline: s.tick + 600,
    rewardKcs: 500,
    rewardBony: 1,
    rewardKupon: true,
  };
}

describe('pětiletka', () => {
  it('plan defs are data with unique ids', () => {
    const ids = PLAN_DEFS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PLAN_DEFS.length).toBeGreaterThanOrEqual(5);
  });

  it('a fresh era gets its first plan after the grace period', () => {
    let s = { ...freshState(), tick: PLAN_FIRST_AT };
    s = processPlan(s, createRng(1));
    expect(s.plan).not.toBeNull();
    expect(describePlan(s.plan!).length).toBeGreaterThan(3);
    expect(s.log.some((e) => e.text.includes(describePlan(s.plan!)))).toBe(true);
  });

  it('completes and pays out — money, bon and the promised kupón', () => {
    let s = freshState();
    s = { ...s, plan: brigadePlan(s), stats: { ...s.stats, brigadeClicks: s.stats.brigadeClicks + 5 } };
    const before = s;
    s = processPlan(s, createRng(1));
    expect(s.plan).toBeNull();
    expect(s.money).toBe(before.money + 500);
    expect(s.bony).toBe(before.bony + 1);
    expect(s.meta.kupony).toBe(before.meta.kupony + 1);
    expect(s.log.some((e) => e.kind === 'milestone')).toBe(true);
  });

  it('expires with a reputation slap', () => {
    let s = freshState();
    const plan = { ...brigadePlan(s), deadline: s.tick };
    s = { ...s, plan };
    const before = s.reputation;
    s = processPlan(s, createRng(1));
    expect(s.plan).toBeNull();
    expect(s.reputation).toBeLessThan(before);
  });

  it('happy plan accumulates ticks above the threshold', () => {
    let s = withTenant(freshState(), 1, { happiness: 95 });
    const plan: ActivePlan = {
      id: 'happy',
      target: 3,
      baseline: 0,
      progress: 0,
      threshold: 75,
      deadline: s.tick + 600,
      rewardKcs: 100,
      rewardBony: 1,
      rewardKupon: false,
    };
    s = { ...s, plan };
    s = processPlan(s, createRng(1));
    expect(s.plan!.progress).toBe(1);
  });
});

describe('rekonstrukce bytů', () => {
  it('costs escalate per level and raise rent + happiness target', () => {
    expect(flatRenoCost(0)).toBeLessThan(flatRenoCost(1));
    expect(flatRenoCost(FLAT_RENO_MAX)).toBe(Infinity);

    let s = withTenant(withFloors(freshState(), 1), 0, { happiness: 80 });
    const baseIncome = incomePerSec(s);
    const baseTarget = happinessTarget(s, s.buildings[0].flats[0]);
    const b = s.buildings[0];
    s = {
      ...s,
      buildings: [
        { ...b, flats: b.flats.map((f) => (f.index === 0 ? { ...f, renovation: 3 } : f)) },
      ],
    };
    expect(incomePerSec(s)).toBeCloseTo(baseIncome * 1.24, 5);
    expect(happinessTarget(s, s.buildings[0].flats[0])).toBe(baseTarget + 15);
  });
});

describe('výstavba sídliště', () => {
  it('projects lift the whole estate and the school speeds up move-ins', () => {
    const s = withTenant(withFloors(freshState(), 1), 0, { happiness: 70 });
    const flat = s.buildings[0].flats[0];
    const base = happinessTarget(s, flat);
    const withAll = {
      ...s,
      projects: { samoobsluha: true, skolka: false, kulturak: true },
    };
    expect(happinessTarget(withAll, flat)).toBe(base + 4 + 8);
    expect(SKOLKA_MOVE_IN_MULT).toBeGreaterThan(1);
  });

  it('the kulturní dům drips a bon on schedule', () => {
    let s = withFloors(freshState(), 1);
    s = {
      ...s,
      tick: KULTURAK_BON_INTERVAL - 1,
      projects: { ...s.projects, kulturak: true },
      plan: null,
      nextPlanAt: 999999,
    };
    const next = tick(s);
    expect(next.bony).toBe(s.bony + 1);
  });
});
