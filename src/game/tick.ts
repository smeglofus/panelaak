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
  updateFlat,
} from './state';
import {
  BRIGADE_ENERGY_MAX,
  BRIGADE_ENERGY_REGEN,
  CARETAKER_FIX_CHANCE,
  CARETAKER_WAGE_PER_SEC,
  COUPLE_ELEVATOR_EXTRA_PENALTY,
  DISIDENT_LOYALTY_REP,
  DISIDENT_LOYALTY_SECONDS,
  EARLY_MOVE_IN_BOOST,
  EARLY_MOVE_IN_MAX_OCCUPIED,
  ELEVATOR_BREAK_CHANCE,
  ELEVATOR_BROKEN_TARGET_PENALTY,
  ELEVATOR_DECAY_MULT,
  ELEVATOR_MIN_FLOORS,
  ELEVATOR_NDR_BREAK_MULT,
  elevatorRepairCost,
  FAMILY_HOT_WATER_EXTRA,
  FLATS_PER_FLOOR,
  formatKcs,
  HAPPINESS_BASE_TARGET,
  HAPPINESS_DRIFT_RATE,
  HOT_WATER_TARGET_PENALTY,
  incomePerSec,
  KUTIL_FIX_CHANCE,
  LAUNDRY_REGEN_MULT,
  LAVICKY_PENSIONER_BONUS,
  LEAK_CHANCE,
  MAX_FLOORS,
  MILESTONE_REWARDS,
  MOVE_OUT_GRACE_SECONDS,
  MOVE_OUT_HAPPINESS_THRESHOLD,
  moveInChance,
  MUSICIAN_MOVE_IN_REP,
  MUSICIAN_NEIGHBOR_DRAG,
  PENSIONER_NEIGHBOR_DRAG,
  PISKOVISTE_FAMILY_BONUS,
  PROBLEM_DEFS,
  REP_MILESTONE,
  REP_MOVE_IN,
  REP_MOVE_OUT,
  SATELLITE_TARGET_BONUS,
  SUSAK_TARGET_BONUS,
  SVAZAK_NEIGHBOR_DRAG,
  TENANT_STARTING_HAPPINESS,
  VZORNY_DUM_HAPPINESS,
  ZAHONKY_TARGET_BONUS,
} from './economy';

export interface HappinessFactor {
  label: string;
  delta: number;
}

function hasNeighbor(s: GameState, flat: Flat, archetype: string): boolean {
  return mainBuilding(s).flats.some(
    (f) =>
      f.index !== flat.index &&
      f.floor === flat.floor &&
      f.tenant?.archetype === archetype,
  );
}

/**
 * Everything that pushes a tenant's mood up or down, as labelled deltas —
 * the same list drives the simulation and the tenant-card diagnostics.
 */
export function happinessFactors(s: GameState, flat: Flat): HappinessFactor[] {
  const b = mainBuilding(s);
  const t = flat.tenant;
  const factors: HappinessFactor[] = [];
  const F = CS.factors;

  if (s.upgrades.satellite) factors.push({ label: F.satellite, delta: SATELLITE_TARGET_BONUS });
  if (s.courtyard.zahonky) factors.push({ label: F.zahonky, delta: ZAHONKY_TARGET_BONUS });
  if (s.courtyard.susak) factors.push({ label: F.susak, delta: SUSAK_TARGET_BONUS });
  if (s.courtyard.piskoviste && t?.archetype === 'family') {
    factors.push({ label: F.piskoviste, delta: PISKOVISTE_FAMILY_BONUS });
  }
  if (s.courtyard.lavicky && t?.archetype === 'pensioner') {
    factors.push({ label: F.lavicky, delta: LAVICKY_PENSIONER_BONUS });
  }

  if (isEventActive(s, 'hotWater')) {
    factors.push({ label: F.hotWater, delta: -HOT_WATER_TARGET_PENALTY });
    if (t?.archetype === 'family') {
      factors.push({ label: F.hotWaterFamily, delta: -FAMILY_HOT_WATER_EXTRA });
    }
  }

  if (flat.problem) {
    factors.push({ label: F[flat.problem], delta: -PROBLEM_DEFS[flat.problem].targetPenalty });
  }

  if (b.elevatorBroken && flat.floor >= ELEVATOR_MIN_FLOORS) {
    factors.push({ label: F.elevator, delta: -ELEVATOR_BROKEN_TARGET_PENALTY });
    if (t?.archetype === 'couple') {
      factors.push({ label: F.elevatorCouple, delta: -COUPLE_ELEVATOR_EXTRA_PENALTY });
    }
  }

  if (t?.archetype !== 'pensioner' && hasNeighbor(s, flat, 'pensioner')) {
    factors.push({ label: F.pensionerDrag, delta: -PENSIONER_NEIGHBOR_DRAG });
  }
  if (t?.archetype !== 'svazak' && hasNeighbor(s, flat, 'svazak')) {
    factors.push({ label: F.svazakDrag, delta: -SVAZAK_NEIGHBOR_DRAG });
  }
  if (t?.archetype !== 'musician' && hasNeighbor(s, flat, 'musician')) {
    factors.push({ label: F.musicianDrag, delta: -MUSICIAN_NEIGHBOR_DRAG });
  }

  return factors;
}

/** The happiness level a tenant drifts toward, derived from building condition. */
export function happinessTarget(s: GameState, flat: Flat): number {
  const sum = happinessFactors(s, flat).reduce((acc, f) => acc + f.delta, 0);
  return clamp(HAPPINESS_BASE_TARGET + sum, 0, 100);
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
  const income = incomePerSec(s);
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
    const tenant = createTenant(rng, s.nextTenantId, TENANT_STARTING_HAPPINESS, s.tick);
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
    if (tenant.archetype === 'musician') {
      s = {
        ...s,
        reputation: clamp(s.reputation + MUSICIAN_MOVE_IN_REP, 0, 100),
      };
      s = addLog(s, 'good', CS.toasts.musicianMoveIn);
    }
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
      s = updateFlat(s, target.index, (f) => ({ ...f, problem: 'leak' as const }));
      s = {
        ...s,
        stats: { ...s.stats, breakdowns: s.stats.breakdowns + 1 },
      };
      s = addLog(s, 'bad', CS.toasts.leak(CS.ui.flatLabel(target.index + 1)));
    }
  }

  return s;
}

/** Archetype one-offs and passives that run on the clock. */
function processQuirks(s: GameState, rng: Rng): GameState {
  // Kutil quietly fixes a leak now and then.
  const hasKutil = mainBuilding(s).flats.some((f) => f.tenant?.archetype === 'kutil');
  if (hasKutil && rng.chance(KUTIL_FIX_CHANCE)) {
    const leaky = mainBuilding(s).flats.filter((f) => f.problem === 'leak');
    if (leaky.length > 0) {
      const target = rng.pick(leaky);
      s = updateFlat(s, target.index, (f) => ({ ...f, problem: null }));
      s = addLog(s, 'good', CS.toasts.kutilFix(CS.ui.flatLabel(target.index + 1)));
    }
  }

  // Disident who survives long enough proves the house holds together.
  for (const flat of mainBuilding(s).flats) {
    const t = flat.tenant;
    if (
      t?.archetype === 'disident' &&
      !t.quirkDone &&
      s.tick - t.movedInAt >= DISIDENT_LOYALTY_SECONDS
    ) {
      s = updateFlat(s, flat.index, (f) => ({
        ...f,
        tenant: { ...f.tenant!, quirkDone: true },
      }));
      s = { ...s, reputation: clamp(s.reputation + DISIDENT_LOYALTY_REP, 0, 100) };
      s = addLog(s, 'good', CS.toasts.disidentLoyal);
    }
  }

  return s;
}

/** Pan Fanda: takes a wage, fixes what is broken — eventually, if funds allow. */
function processCaretaker(s: GameState, rng: Rng): GameState {
  if (!s.caretakerHired) return s;

  s = { ...s, money: Math.max(0, s.money - CARETAKER_WAGE_PER_SEC) };

  const b = mainBuilding(s);
  if (b.elevatorBroken) {
    const cost = elevatorRepairCost(b.floors);
    if (s.money >= cost && rng.chance(CARETAKER_FIX_CHANCE)) {
      s = {
        ...s,
        money: s.money - cost,
        buildings: [{ ...mainBuilding(s), elevatorBroken: false }],
      };
      s = addLog(s, 'good', CS.toasts.caretakerElevator(formatKcs(cost)));
    }
  }

  for (const flat of mainBuilding(s).flats) {
    if (!flat.problem) continue;
    const cost = PROBLEM_DEFS[flat.problem].repairCost;
    if (s.money < cost || !rng.chance(CARETAKER_FIX_CHANCE)) continue;
    const label = CS.ui.flatLabel(flat.index + 1);
    const text =
      flat.problem === 'leak'
        ? CS.toasts.caretakerLeak(label, formatKcs(cost))
        : CS.toasts.caretakerWindow(label, formatKcs(cost));
    s = { ...s, money: s.money - cost };
    s = updateFlat(s, flat.index, (f) => ({ ...f, problem: null }));
    s = addLog(s, 'good', text);
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
  s = processQuirks(s, rng);
  s = processCaretaker(s, rng);
  s = processEvents(s, rng);
  s = checkMilestones(s);

  return { ...s, rngSeed: rng.state() };
}
