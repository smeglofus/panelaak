// Pětiletka: rotating assignments from the OV. One plan runs at a time,
// procedurally scaled to the current sídliště, with a deadline, a reward and
// a dry note in the kronika either way. Pure functions over GameState.

import type { ActivePlan, GameState, PlanId } from './types';
import type { Rng } from './rng';
import { CS } from './content.cs';
import { addLog, allFlats, avgHappiness, clamp, totalFloors } from './state';
import {
  formatKcs,
  incomePerSec,
  PLAN_COOLDOWN,
  PLAN_FAIL_REP,
  PLAN_HAPPY_THRESHOLD,
  PLAN_KUPON_CHANCE,
} from './economy';
import { SECONDS_PER_DAY } from './calendar';

interface PlanDef {
  id: PlanId;
  weight: number;
  /** Some plans only make sense in some states. */
  condition?: (s: GameState) => boolean;
  /** Duration in game days. */
  days: number;
  make: (s: GameState, rng: Rng) => Pick<ActivePlan, 'target' | 'baseline' | 'threshold'>;
  /** Current progress toward target. */
  progressOf: (s: GameState, plan: ActivePlan) => number;
}

const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);

export const PLAN_DEFS: readonly PlanDef[] = [
  {
    id: 'earn',
    weight: 22,
    days: 15,
    make: (s) => ({
      target: roundTo(incomePerSec(s) * 15 * SECONDS_PER_DAY * 0.7, 100),
      baseline: s.totalEarned,
    }),
    progressOf: (s, plan) => s.totalEarned - plan.baseline,
  },
  {
    id: 'movein',
    weight: 18,
    days: 20,
    condition: (s) => allFlats(s).filter((f) => !f.tenant).length >= 2,
    make: (s) => ({
      target: Math.min(2 + s.buildings.length, allFlats(s).filter((f) => !f.tenant).length),
      baseline: s.stats.moveIns,
    }),
    progressOf: (s, plan) => s.stats.moveIns - plan.baseline,
  },
  {
    id: 'fix',
    weight: 18,
    days: 20,
    make: (s) => ({
      target: 2 + s.buildings.length,
      baseline: s.stats.repairsDone,
    }),
    progressOf: (s, plan) => s.stats.repairsDone - plan.baseline,
  },
  {
    id: 'happy',
    weight: 20,
    days: 20,
    condition: (s) => allFlats(s).some((f) => f.tenant),
    make: () => ({
      target: 10 * SECONDS_PER_DAY, // 10 days at/above the threshold, accumulated
      baseline: 0,
      threshold: PLAN_HAPPY_THRESHOLD,
    }),
    progressOf: (_s, plan) => plan.progress,
  },
  {
    id: 'brigade',
    weight: 16,
    days: 15,
    make: (s) => ({
      target: 20 + totalFloors(s),
      baseline: s.stats.brigadeClicks,
    }),
    progressOf: (s, plan) => s.stats.brigadeClicks - plan.baseline,
  },
];

function pickWeightedDef(defs: readonly PlanDef[], rng: Rng): PlanDef {
  const total = defs.reduce((sum, d) => sum + d.weight, 0);
  let roll = rng.next() * total;
  for (const d of defs) {
    roll -= d.weight;
    if (roll < 0) return d;
  }
  return defs[defs.length - 1];
}

export function generatePlan(s: GameState, rng: Rng): ActivePlan {
  const eligible = PLAN_DEFS.filter((d) => !d.condition || d.condition(s));
  const def = pickWeightedDef(eligible, rng);
  const base = def.make(s, rng);
  return {
    id: def.id,
    target: base.target,
    baseline: base.baseline,
    threshold: base.threshold,
    progress: 0,
    deadline: s.tick + def.days * SECONDS_PER_DAY,
    rewardKcs: roundTo(incomePerSec(s) * 120 + 100, 10),
    rewardBony: 1,
    rewardKupon: rng.chance(PLAN_KUPON_CHANCE),
  };
}

export function describePlan(plan: ActivePlan): string {
  const t = CS.plans.tasks;
  switch (plan.id) {
    case 'earn':
      return t.earn(formatKcs(plan.target));
    case 'movein':
      return t.movein(plan.target);
    case 'fix':
      return t.fix(plan.target);
    case 'happy':
      return t.happy(plan.threshold ?? PLAN_HAPPY_THRESHOLD, Math.round(plan.target / SECONDS_PER_DAY));
    case 'brigade':
      return t.brigade(plan.target);
  }
}

export function planProgress(s: GameState, plan: ActivePlan): number {
  const def = PLAN_DEFS.find((d) => d.id === plan.id)!;
  return clamp(def.progressOf(s, plan), 0, plan.target);
}

/** One tick of the pětiletka machinery: issue, advance, resolve. */
export function processPlan(s: GameState, rng: Rng): GameState {
  if (!s.plan) {
    if (s.tick >= s.nextPlanAt) {
      const plan = generatePlan(s, rng);
      s = { ...s, plan };
      s = addLog(s, 'event', CS.plans.started(describePlan(plan)));
    }
    return s;
  }

  let plan = s.plan;
  if (plan.id === 'happy' && avgHappiness(s) >= (plan.threshold ?? PLAN_HAPPY_THRESHOLD)) {
    plan = { ...plan, progress: plan.progress + 1 };
    s = { ...s, plan };
  }

  if (planProgress(s, plan) >= plan.target) {
    s = {
      ...s,
      plan: null,
      nextPlanAt: s.tick + PLAN_COOLDOWN,
      money: s.money + plan.rewardKcs,
      totalEarned: s.totalEarned + plan.rewardKcs,
      bony: s.bony + plan.rewardBony,
      meta: plan.rewardKupon
        ? {
            ...s.meta,
            kupony: s.meta.kupony + 1,
            records: {
              ...s.meta.records,
              kuponyEarnedTotal: s.meta.records.kuponyEarnedTotal + 1,
            },
          }
        : s.meta,
    };
    return addLog(s, 'milestone', CS.plans.done(describePlan(plan), formatKcs(plan.rewardKcs)));
  }

  if (s.tick >= plan.deadline) {
    s = {
      ...s,
      plan: null,
      nextPlanAt: s.tick + PLAN_COOLDOWN,
      reputation: clamp(s.reputation + PLAN_FAIL_REP, 0, 100),
    };
    return addLog(s, 'bad', CS.plans.failed(describePlan(plan)));
  }

  return s;
}
