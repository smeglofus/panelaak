// The pure 1-second tick reducer (spec §5). No React, no Date.now(), no
// Math.random() — all randomness comes from the seed in GameState, so
// tick(state) is fully deterministic.

import type { Flat, GameState, MilestoneId } from './types';
import { createRng, type Rng } from './rng';
import { CS } from './content.cs';
import { createTenant } from './tenants';
import { processEvents } from './events';
import {
  addLog,
  avgHappiness,
  clamp,
  isEventActive,
  mainBuilding,
  mapTenants,
  occupiedCount,
} from './state';
import {
  BRIGADE_ENERGY_MAX,
  BRIGADE_ENERGY_REGEN,
  CELLAR_RENT_MULT,
  COUPLE_ELEVATOR_EXTRA_PENALTY,
  EARLY_MOVE_IN_BOOST,
  EARLY_MOVE_IN_MAX_OCCUPIED,
  ELEVATOR_BREAK_CHANCE,
  ELEVATOR_BROKEN_TARGET_PENALTY,
  ELEVATOR_DECAY_MULT,
  ELEVATOR_MIN_FLOORS,
  ELEVATOR_NDR_BREAK_MULT,
  FLATS_PER_FLOOR,
  formatKcs,
  HAPPINESS_BASE_TARGET,
  HAPPINESS_DRIFT_RATE,
  HOT_WATER_TARGET_PENALTY,
  LAUNDRY_REGEN_MULT,
  LEAK_CHANCE,
  LEAK_TARGET_PENALTY,
  MAX_FLOORS,
  MILESTONE_REWARDS,
  MOVE_OUT_GRACE_SECONDS,
  MOVE_OUT_HAPPINESS_THRESHOLD,
  moveInChance,
  PENSIONER_NEIGHBOR_DRAG,
  REP_MILESTONE,
  REP_MOVE_IN,
  REP_MOVE_OUT,
  SATELLITE_TARGET_BONUS,
  TENANT_STARTING_HAPPINESS,
  tenantRentPerSec,
  VZORNY_DUM_HAPPINESS,
} from './economy';

/** The happiness level a tenant drifts toward, derived from building condition. */
export function happinessTarget(s: GameState, flat: Flat): number {
  const b = mainBuilding(s);
  let target = HAPPINESS_BASE_TARGET;

  if (s.upgrades.satellite) target += SATELLITE_TARGET_BONUS;
  if (isEventActive(s, 'hotWater')) target -= HOT_WATER_TARGET_PENALTY;
  if (flat.problem === 'leak') target -= LEAK_TARGET_PENALTY;

  if (b.elevatorBroken && flat.floor >= ELEVATOR_MIN_FLOORS) {
    target -= ELEVATOR_BROKEN_TARGET_PENALTY;
    if (flat.tenant?.archetype === 'couple') target -= COUPLE_ELEVATOR_EXTRA_PENALTY;
  }

  const pensionerNextDoor = b.flats.some(
    (f) =>
      f.index !== flat.index &&
      f.floor === flat.floor &&
      f.tenant?.archetype === 'pensioner',
  );
  if (pensionerNextDoor && flat.tenant?.archetype !== 'pensioner') {
    target -= PENSIONER_NEIGHBOR_DRAG;
  }

  return clamp(target, 0, 100);
}

function updateHappiness(s: GameState): GameState {
  const b = mainBuilding(s);
  return mapTenants(s, (t, f) => {
    const target = happinessTarget(s, f);
    let rate = HAPPINESS_DRIFT_RATE;
    if (target > t.happiness && s.upgrades.laundry) rate *= LAUNDRY_REGEN_MULT;
    if (target < t.happiness && b.elevatorBroken && f.floor >= ELEVATOR_MIN_FLOORS) {
      rate *= ELEVATOR_DECAY_MULT;
    }
    const happiness = clamp(t.happiness + (target - t.happiness) * rate, 0, 100);
    const below = happiness < MOVE_OUT_HAPPINESS_THRESHOLD;
    return {
      ...t,
      happiness,
      unhappySince: below ? (t.unhappySince ?? s.tick) : null,
    };
  });
}

function collectRent(s: GameState): GameState {
  const mult = s.upgrades.cellar ? CELLAR_RENT_MULT : 1;
  let income = 0;
  for (const flat of mainBuilding(s).flats) {
    if (flat.tenant) income += tenantRentPerSec(flat.tenant);
  }
  income *= mult;
  return { ...s, money: s.money + income, totalEarned: s.totalEarned + income };
}

function processMoveOuts(s: GameState): GameState {
  for (const flat of mainBuilding(s).flats) {
    const t = flat.tenant;
    if (!t || t.archetype === 'pensioner') continue; // paní Vlasta never leaves
    if (t.unhappySince !== null && s.tick - t.unhappySince >= MOVE_OUT_GRACE_SECONDS) {
      const b = mainBuilding(s);
      const flats = b.flats.map((f) => (f.index === flat.index ? { ...f, tenant: null } : f));
      s = {
        ...s,
        buildings: [{ ...b, flats }],
        reputation: clamp(s.reputation + REP_MOVE_OUT, 0, 100),
        stats: { ...s.stats, moveOuts: s.stats.moveOuts + 1 },
      };
      s = addLog(s, 'bad', CS.toasts.moveOut(t.name, CS.ui.flatLabel(flat.index + 1)));
    }
  }
  return s;
}

function processMoveIns(s: GameState, rng: Rng): GameState {
  for (const flat of mainBuilding(s).flats) {
    if (flat.tenant) continue;
    const earlyBoost =
      occupiedCount(s) < EARLY_MOVE_IN_MAX_OCCUPIED ? EARLY_MOVE_IN_BOOST : 1;
    if (!rng.chance(moveInChance(s.reputation) * earlyBoost)) continue;
    const tenant = createTenant(rng, s.nextTenantId, TENANT_STARTING_HAPPINESS);
    const b = mainBuilding(s);
    const flats = b.flats.map((f) => (f.index === flat.index ? { ...f, tenant } : f));
    s = {
      ...s,
      buildings: [{ ...b, flats }],
      nextTenantId: s.nextTenantId + 1,
      reputation: clamp(s.reputation + REP_MOVE_IN, 0, 100),
      stats: { ...s.stats, moveIns: s.stats.moveIns + 1 },
    };
    s = addLog(s, 'good', CS.toasts.moveIn(tenant.name, CS.ui.flatLabel(flat.index + 1)));
  }
  return s;
}

function processBreakdowns(s: GameState, rng: Rng): GameState {
  const b = mainBuilding(s);

  if (b.floors >= ELEVATOR_MIN_FLOORS && !b.elevatorBroken) {
    const chance = ELEVATOR_BREAK_CHANCE * (s.upgrades.elevatorNdr ? ELEVATOR_NDR_BREAK_MULT : 1);
    if (rng.chance(chance)) {
      s = {
        ...s,
        buildings: [{ ...b, elevatorBroken: true }],
        stats: { ...s.stats, breakdowns: s.stats.breakdowns + 1 },
      };
      s = addLog(s, 'bad', CS.toasts.elevatorBroke);
    }
  }

  if (rng.chance(LEAK_CHANCE)) {
    const candidates = mainBuilding(s).flats.filter((f) => f.tenant && !f.problem);
    if (candidates.length > 0) {
      const target = rng.pick(candidates);
      const b2 = mainBuilding(s);
      const flats = b2.flats.map((f) =>
        f.index === target.index ? { ...f, problem: 'leak' as const } : f,
      );
      s = {
        ...s,
        buildings: [{ ...b2, flats }],
        stats: { ...s.stats, breakdowns: s.stats.breakdowns + 1 },
      };
      s = addLog(s, 'bad', CS.toasts.leak(CS.ui.flatLabel(target.index + 1)));
    }
  }

  return s;
}

interface MilestoneDef {
  id: MilestoneId;
  achieved: (s: GameState) => boolean;
}

const MILESTONE_DEFS: readonly MilestoneDef[] = [
  {
    id: 'firstFullFloor',
    achieved: (s) => {
      const byFloor = new Map<number, number>();
      for (const f of mainBuilding(s).flats) {
        if (f.tenant) byFloor.set(f.floor, (byFloor.get(f.floor) ?? 0) + 1);
      }
      return [...byFloor.values()].some((n) => n >= FLATS_PER_FLOOR);
    },
  },
  { id: 'first1000', achieved: (s) => s.totalEarned >= 1000 },
  { id: 'elevatorInstalled', achieved: (s) => mainBuilding(s).floors >= ELEVATOR_MIN_FLOORS },
  { id: 'eightFloors', achieved: (s) => mainBuilding(s).floors >= MAX_FLOORS },
  {
    id: 'vzornyDum',
    achieved: (s) =>
      mainBuilding(s).floors >= MAX_FLOORS &&
      occupiedCount(s) === MAX_FLOORS * FLATS_PER_FLOOR &&
      avgHappiness(s) >= VZORNY_DUM_HAPPINESS,
  },
];

function checkMilestones(s: GameState): GameState {
  for (const def of MILESTONE_DEFS) {
    if (!s.milestones[def.id] && def.achieved(s)) {
      const reward = MILESTONE_REWARDS[def.id];
      s = {
        ...s,
        milestones: { ...s.milestones, [def.id]: true },
        money: s.money + reward,
        totalEarned: s.totalEarned + reward,
        reputation: clamp(s.reputation + REP_MILESTONE, 0, 100),
      };
      s = addLog(
        s,
        'milestone',
        `${CS.milestones[def.id].toast} ${CS.ui.milestoneReward(formatKcs(reward))}`,
      );
    }
  }
  return s;
}

export function tick(prev: GameState): GameState {
  // Interactive events pause the simulation (spec §10 recommendation).
  if (prev.pendingChoice) return prev;

  const rng = createRng(prev.rngSeed);
  let s: GameState = {
    ...prev,
    tick: prev.tick + 1,
    energy: Math.min(BRIGADE_ENERGY_MAX, prev.energy + BRIGADE_ENERGY_REGEN),
  };

  s = updateHappiness(s);
  s = collectRent(s);
  s = processMoveOuts(s);
  s = processMoveIns(s, rng);
  s = processBreakdowns(s, rng);
  s = processEvents(s, rng);
  s = checkMilestones(s);

  return { ...s, rngSeed: rng.state() };
}
