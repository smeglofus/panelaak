// The pure 1-second tick reducer (spec §5). No React, no Date.now(), no
// Math.random() — all randomness comes from the seed in GameState, so
// tick(state) is fully deterministic. Since v0.5 the world is a sídliště:
// every phase runs across all buildings.

import type { BadgeId, Flat, GameState, MilestoneId } from './types';
import { createRng, type Rng } from './rng';
import { CS } from './content.cs';
import { createTenant } from './tenants';
import { processEvents, majChoice } from './events';
import { processPlan } from './plans';
import { processArrests } from './secrets';
import {
  dateFromTick,
  dateJustReached,
  isSummer,
  isWinter,
  regimeFell,
  REVOLUTION,
} from './calendar';
import {
  addLog,
  allFlats,
  avgHappiness,
  clamp,
  isEventActive,
  mainBuilding,
  mapTenants,
  occupiedCount,
  occupiedIn,
  totalFloors,
  updateFlat,
} from './state';
import {
  BADGE_KUPON_REWARD,
  BRIGADE_ENERGY_MAX,
  brigadeRegen,
  CARETAKER_FIX_CHANCE,
  CARETAKER_WAGE_PER_SEC,
  CHRIPKA_PENALTY,
  comfortExcessLoss,
  COUPLE_ELEVATOR_EXTRA_PENALTY,
  DIGITALKY_FIX_MULT,
  DISIDENT_LOYALTY_REP,
  DISIDENT_LOYALTY_SECONDS,
  driftToward50,
  EARLY_MOVE_IN_BOOST,
  EARLY_MOVE_IN_MAX_OCCUPIED,
  ELEVATOR_BREAK_CHANCE,
  ELEVATOR_BROKEN_TARGET_PENALTY,
  ELEVATOR_DECAY_MULT,
  ELEVATOR_MIN_FLOORS,
  ELEVATOR_NDR_BREAK_MULT,
  elevatorRepairCost,
  FAMILY_HOT_WATER_EXTRA,
  FLAT_RENO_TARGET_BONUS,
  FLATS_PER_FLOOR,
  formatKcs,
  HAPPINESS_BASE_TARGET,
  HAPPINESS_DRIFT_RATE,
  HEATING_COST_PER_FLOOR,
  HOT_WATER_TARGET_PENALTY,
  incomePerSec,
  KULTURAK_BON_INTERVAL,
  KULTURAK_TARGET_BONUS,
  KUTIL_FIX_CHANCE,
  LAUNDRY_REGEN_MULT,
  LAUNDRY_REGEN_MULT_WEST,
  LAVICKY_PENSIONER_BONUS,
  LEAK_CHANCE,
  LUSTRACE_COVERED_MIN,
  LUSTRACE_REPORTED_LIMIT,
  BUILDINGS_BASE,
  MAX_FLOORS,
  MILESTONE_BONY,
  MILESTONE_REWARDS,
  MILIONAR_EARNED,
  MOVE_OUT_GRACE_SECONDS,
  MOVE_OUT_HAPPINESS_THRESHOLD,
  moveInChance,
  KONFIDENT_REPORTED,
  MUSICIAN_MOVE_IN_REP,
  MUSICIAN_NEIGHBOR_DRAG,
  ODSTAVKA_DURATION,
  PENSIONER_NEIGHBOR_DRAG,
  PISKOVISTE_FAMILY_BONUS,
  PROBLEM_DEFS,
  PROVERENY_STB_VISITS,
  RADIATOR_CHANCE,
  regimeMoveInMult,
  REP_MILESTONE,
  REP_MOVE_IN,
  REP_MOVE_OUT,
  REP_REVOLUTION_HERO,
  REP_REVOLUTION_MINOR,
  REP_REVOLUTION_TRAITOR,
  SAMOOBSLUHA_TARGET_BONUS,
  SATELLITE_TARGET_BONUS,
  SITES,
  SKOLKA_FAMILY_BONUS,
  SKOLKA_MOVE_IN_MULT,
  SLUSNY_CLOVEK_COVERED,
  STUDENA_VODA_PENALTY,
  SUMMER_TARGET_BONUS,
  SUSAK_TARGET_BONUS,
  SVAZAK_NEIGHBOR_DRAG,
  TENANT_STARTING_HAPPINESS,
  TV_TARGET_BONUS,
  UDERNIK_CLICKS,
  VANOCE_HAPPINESS_BONUS,
  VEDRO_PENALTY,
  VEDRO_PENSIONER_EXTRA,
  VEKSLAK_BON_CHANCE,
  VZORNY_DUM_HAPPINESS,
  WINTER_TARGET_PENALTY,
  ZAHONKY_TARGET_BONUS,
} from './economy';

export interface HappinessFactor {
  label: string;
  delta: number;
}

function hasNeighbor(s: GameState, flat: Flat, archetype: string): boolean {
  return s.buildings[flat.bldg].flats.some(
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
  const b = s.buildings[flat.bldg];
  const t = flat.tenant;
  const factors: HappinessFactor[] = [];
  const F = CS.factors;

  const date = dateFromTick(s.tick);
  if (isWinter(date)) factors.push({ label: F.winter, delta: -WINTER_TARGET_PENALTY });
  if (isSummer(date)) factors.push({ label: F.summer, delta: SUMMER_TARGET_BONUS });

  const site = SITES[b.site];
  if (site.targetDelta !== 0) {
    factors.push({ label: CS.sites[b.site].factor, delta: site.targetDelta });
  }

  if (s.upgrades.satellite) factors.push({ label: F.satellite, delta: SATELLITE_TARGET_BONUS });
  if (s.tuzex.tv) factors.push({ label: F.tv, delta: TV_TARGET_BONUS });
  if (flat.renovation > 0) {
    factors.push({ label: F.reno, delta: FLAT_RENO_TARGET_BONUS * flat.renovation });
  }
  if (s.projects.samoobsluha) {
    factors.push({ label: F.samoobsluha, delta: SAMOOBSLUHA_TARGET_BONUS });
  }
  if (s.projects.skolka && t?.archetype === 'family') {
    factors.push({ label: F.skolka, delta: SKOLKA_FAMILY_BONUS });
  }
  if (s.projects.kulturak) {
    factors.push({ label: F.kulturak, delta: KULTURAK_TARGET_BONUS });
  }
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

  if (isEventActive(s, 'studenaVoda')) {
    factors.push({ label: F.studenaVoda, delta: -STUDENA_VODA_PENALTY });
  }
  if (isEventActive(s, 'vedro')) {
    factors.push({ label: F.vedro, delta: -VEDRO_PENALTY });
    if (t?.archetype === 'pensioner') {
      factors.push({ label: F.vedroPensioner, delta: -VEDRO_PENSIONER_EXTRA });
    }
  }
  if (isEventActive(s, 'chripka')) {
    factors.push({ label: F.chripka, delta: -CHRIPKA_PENALTY });
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

  // Diminishing returns on comfort: the surplus above the knee mostly turns
  // into vysoké nároky — shown as its own factor so the card still adds up.
  const positive = factors.reduce((acc, f) => acc + (f.delta > 0 ? f.delta : 0), 0);
  const loss = comfortExcessLoss(positive);
  if (loss > 0) factors.push({ label: F.naroky, delta: -loss });

  return factors;
}

/** The happiness level a tenant drifts toward, derived from building condition. */
export function happinessTarget(s: GameState, flat: Flat): number {
  const sum = happinessFactors(s, flat).reduce((acc, f) => acc + f.delta, 0);
  return clamp(HAPPINESS_BASE_TARGET + sum, 0, 100);
}

function updateHappiness(s: GameState): GameState {
  return mapTenants(s, (t, f) => {
    const b = s.buildings[f.bldg];
    const target = happinessTarget(s, f);
    let rate = HAPPINESS_DRIFT_RATE;
    if (target > t.happiness && s.upgrades.laundry) {
      rate *= s.tuzex.pracka ? LAUNDRY_REGEN_MULT_WEST : LAUNDRY_REGEN_MULT;
    }
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
  s = { ...s, money: s.money + income, totalEarned: s.totalEarned + income };
  if (income > s.meta.records.bestIncomePerSec + 0.01) {
    s = {
      ...s,
      meta: { ...s.meta, records: { ...s.meta.records, bestIncomePerSec: income } },
    };
  }
  return s;
}

function processMoveOuts(s: GameState): GameState {
  for (const flat of allFlats(s)) {
    const t = flat.tenant;
    if (!t || t.archetype === 'pensioner') continue; // paní Vlasta never leaves
    if (t.unhappySince !== null && s.tick - t.unhappySince >= MOVE_OUT_GRACE_SECONDS) {
      s = updateFlat(s, flat.index, (f) => ({ ...f, tenant: null }));
      s = {
        ...s,
        reputation: clamp(s.reputation + REP_MOVE_OUT, 0, 100),
        stats: { ...s.stats, moveOuts: s.stats.moveOuts + 1 },
      };
      s = addLog(s, 'bad', CS.toasts.moveOut(t.name, CS.ui.flatLabel(flat.index + 1)));
    }
  }
  return s;
}

/** Filed evictions complete after the řízení runs its course. */
function processEvictions(s: GameState): GameState {
  for (const flat of allFlats(s)) {
    const t = flat.tenant;
    if (t?.evictionAt != null && s.tick >= t.evictionAt) {
      s = updateFlat(s, flat.index, (f) => ({ ...f, tenant: null }));
      s = { ...s, stats: { ...s.stats, moveOuts: s.stats.moveOuts + 1 } };
      s = addLog(s, 'info', CS.toasts.evictionDone(t.name, CS.ui.flatLabel(flat.index + 1)));
    }
  }
  return s;
}

function processMoveIns(s: GameState, rng: Rng): GameState {
  // Byty přiděluje ONV — a pořadník se hýbe podle kádrového profilu správce.
  const allocation = regimeMoveInMult(s.regime, regimeFell(s.tick));
  for (const flat of allFlats(s)) {
    if (flat.tenant) continue;
    const earlyBoost =
      occupiedCount(s) < EARLY_MOVE_IN_MAX_OCCUPIED ? EARLY_MOVE_IN_BOOST : 1;
    const siteMult =
      SITES[s.buildings[flat.bldg].site].moveInMult *
      (s.projects.skolka ? SKOLKA_MOVE_IN_MULT : 1);
    if (!rng.chance(moveInChance(s.reputation) * earlyBoost * siteMult * allocation)) continue;
    const tenant = createTenant(rng, s.nextTenantId, TENANT_STARTING_HAPPINESS, s.tick);
    s = updateFlat(s, flat.index, (f) => ({ ...f, tenant }));
    s = {
      ...s,
      nextTenantId: s.nextTenantId + 1,
      reputation: clamp(s.reputation + REP_MOVE_IN, 0, 100),
      stats: { ...s.stats, moveIns: s.stats.moveIns + 1 },
    };
    s = addLog(s, 'good', CS.toasts.moveIn(tenant.name, CS.ui.flatLabel(flat.index + 1)));
    if (tenant.archetype === 'musician') {
      s = { ...s, reputation: clamp(s.reputation + MUSICIAN_MOVE_IN_REP, 0, 100) };
      s = addLog(s, 'good', CS.toasts.musicianMoveIn);
    }
  }
  return s;
}

function processBreakdowns(s: GameState, rng: Rng): GameState {
  for (let bi = 0; bi < s.buildings.length; bi++) {
    const b = s.buildings[bi];
    if (b.floors >= ELEVATOR_MIN_FLOORS && !b.elevatorBroken) {
      const chance =
        ELEVATOR_BREAK_CHANCE * (s.upgrades.elevatorNdr ? ELEVATOR_NDR_BREAK_MULT : 1);
      if (rng.chance(chance)) {
        const buildings = s.buildings.map((bb, i) =>
          i === bi ? { ...bb, elevatorBroken: true } : bb,
        );
        s = {
          ...s,
          buildings,
          stats: { ...s.stats, breakdowns: s.stats.breakdowns + 1 },
        };
        s = addLog(s, 'bad', CS.toasts.elevatorBroke(CS.sites[b.site].name));
      }
    }

    if (rng.chance(LEAK_CHANCE)) {
      const candidates = s.buildings[bi].flats.filter((f) => f.tenant && !f.problem);
      if (candidates.length > 0) {
        const target = rng.pick(candidates);
        s = updateFlat(s, target.index, (f) => ({ ...f, problem: 'leak' as const }));
        s = { ...s, stats: { ...s.stats, breakdowns: s.stats.breakdowns + 1 } };
        s = addLog(s, 'bad', CS.toasts.leak(CS.ui.flatLabel(target.index + 1)));
      }
    }
  }
  return s;
}

/** Archetype one-offs and passives that run on the clock. */
function processQuirks(s: GameState, rng: Rng): GameState {
  const hasKutil = allFlats(s).some((f) => f.tenant?.archetype === 'kutil');
  if (hasKutil && rng.chance(KUTIL_FIX_CHANCE)) {
    const leaky = allFlats(s).filter((f) => f.problem === 'leak');
    if (leaky.length > 0) {
      const target = rng.pick(leaky);
      s = updateFlat(s, target.index, (f) => ({ ...f, problem: null }));
      s = { ...s, stats: { ...s.stats, repairsDone: s.stats.repairsDone + 1 } };
      s = addLog(s, 'good', CS.toasts.kutilFix(CS.ui.flatLabel(target.index + 1)));
    }
  }

  for (const flat of allFlats(s)) {
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

/** Pan Fanda covers the whole sídliště: wage, then fixes what funds allow. */
function processCaretaker(s: GameState, rng: Rng): GameState {
  if (!s.caretakerHired) return s;

  s = { ...s, money: Math.max(0, s.money - CARETAKER_WAGE_PER_SEC) };
  const fixChance = CARETAKER_FIX_CHANCE * (s.tuzex.digitalky ? DIGITALKY_FIX_MULT : 1);

  for (let bi = 0; bi < s.buildings.length; bi++) {
    const b = s.buildings[bi];
    if (!b.elevatorBroken) continue;
    const cost = elevatorRepairCost(b.floors);
    if (s.money >= cost && rng.chance(fixChance)) {
      const buildings = s.buildings.map((bb, i) =>
        i === bi ? { ...bb, elevatorBroken: false } : bb,
      );
      s = { ...s, money: s.money - cost, buildings };
      s = { ...s, stats: { ...s.stats, repairsDone: s.stats.repairsDone + 1 } };
      s = addLog(s, 'good', CS.toasts.caretakerElevator(formatKcs(cost)));
    }
  }

  for (const flat of allFlats(s)) {
    if (!flat.problem) continue;
    const cost = PROBLEM_DEFS[flat.problem].repairCost;
    if (s.money < cost || !rng.chance(fixChance)) continue;
    const text = CS.problems[flat.problem].caretakerFixed(
      CS.ui.flatLabel(flat.index + 1),
      formatKcs(cost),
    );
    s = { ...s, money: s.money - cost };
    s = updateFlat(s, flat.index, (f) => ({ ...f, problem: null }));
    s = { ...s, stats: { ...s.stats, repairsDone: s.stats.repairsDone + 1 } };
    s = addLog(s, 'good', text);
  }

  return s;
}

/** Vekslák leaves the occasional envelope. Don't ask. */
function processBony(s: GameState, rng: Rng): GameState {
  if (s.projects.kulturak && s.tick % KULTURAK_BON_INTERVAL === 0) {
    s = { ...s, bony: s.bony + 1 };
    s = addLog(s, 'good', CS.toasts.kulturakBon);
  }
  const vekslaks = allFlats(s).filter((f) => f.tenant?.archetype === 'vekslak').length;
  for (let i = 0; i < vekslaks; i++) {
    if (rng.chance(VEKSLAK_BON_CHANCE)) {
      s = { ...s, bony: s.bony + 1 };
      s = addLog(s, 'good', CS.toasts.bonReceived);
    }
  }
  return s;
}

/** Heating season, radiator failures and fixed dates: odstávka, Vánoce, 1. máj. */
function processCalendar(s: GameState, rng: Rng): GameState {
  const date = dateFromTick(s.tick);

  if (isWinter(date)) {
    s = { ...s, money: Math.max(0, s.money - HEATING_COST_PER_FLOOR * totalFloors(s)) };

    if (rng.chance(RADIATOR_CHANCE)) {
      const candidates = allFlats(s).filter((f) => f.tenant && !f.problem);
      if (candidates.length > 0) {
        const target = rng.pick(candidates);
        s = updateFlat(s, target.index, (f) => ({ ...f, problem: 'radiator' as const }));
        s = { ...s, stats: { ...s.stats, breakdowns: s.stats.breakdowns + 1 } };
        s = addLog(s, 'bad', CS.events.radiator(CS.ui.flatLabel(target.index + 1)));
      }
    }
  }

  // 1. července: the annual planned hot-water outage. Plán je plán.
  if (dateJustReached(s.tick, 7, 1) && !isEventActive(s, 'hotWater')) {
    s = {
      ...s,
      activeEvents: [...s.activeEvents, { id: 'hotWater', remaining: ODSTAVKA_DURATION }],
    };
    s = addLog(s, 'bad', CS.events.odstavka);
  }

  // 24. prosince: cukroví pro celý dům.
  if (dateJustReached(s.tick, 12, 24)) {
    s = mapTenants(s, (t) => ({
      ...t,
      happiness: clamp(t.happiness + VANOCE_HAPPINESS_BONUS, 0, 100),
    }));
    s = addLog(s, 'good', CS.events.vanoce);
  }

  // 1. máje: výzdoba vchodu se očekává. Po revoluci už ji nikdo nevymáhá.
  if (dateJustReached(s.tick, 5, 1) && s.pendingChoice === null && !regimeFell(s.tick)) {
    s = majChoice(s);
  }

  // 17. listopadu 1989: sametová revoluce. Od téhle chvíle kádrový profil
  // nikoho nezajímá — a dům si vzpomene, kým jeho správce celou dobu byl.
  if (dateJustReached(s.tick, REVOLUTION.month, REVOLUTION.day) && date.year === REVOLUTION.year) {
    s = addLog(s, 'milestone', CS.events.revoluce);
    if (s.stats.reported >= LUSTRACE_REPORTED_LIMIT) {
      s = { ...s, reputation: clamp(s.reputation + REP_REVOLUTION_TRAITOR, 0, 100) };
      s = addLog(s, 'bad', CS.events.revoluceTraitor);
    } else if (s.stats.reported > 0) {
      s = { ...s, reputation: clamp(s.reputation + REP_REVOLUTION_MINOR, 0, 100) };
      s = addLog(s, 'bad', CS.events.revoluceMinor);
    } else if (s.stats.covered >= LUSTRACE_COVERED_MIN) {
      s = { ...s, reputation: clamp(s.reputation + REP_REVOLUTION_HERO, 0, 100) };
      s = addLog(s, 'good', CS.events.revoluceHero);
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
      const byFloor = new Map<string, number>();
      for (const f of allFlats(s)) {
        if (f.tenant) {
          const key = `${f.bldg}:${f.floor}`;
          byFloor.set(key, (byFloor.get(key) ?? 0) + 1);
        }
      }
      return [...byFloor.values()].some((n) => n >= FLATS_PER_FLOOR);
    },
  },
  { id: 'first1000', achieved: (s) => s.totalEarned >= 1000 },
  { id: 'elevatorInstalled', achieved: (s) => mainBuilding(s).floors >= ELEVATOR_MIN_FLOORS },
  { id: 'eightFloors', achieved: (s) => s.buildings.some((b) => b.floors >= MAX_FLOORS) },
  {
    id: 'vzornyDum',
    achieved: (s) => {
      const b = mainBuilding(s);
      if (b.floors < MAX_FLOORS || occupiedIn(b) < MAX_FLOORS * FLATS_PER_FLOOR) return false;
      const tenants = b.flats.filter((f) => f.tenant);
      const avg = tenants.reduce((sum, f) => sum + f.tenant!.happiness, 0) / tenants.length;
      return avg >= VZORNY_DUM_HAPPINESS;
    },
  },
];

function checkMilestones(s: GameState): GameState {
  for (const def of MILESTONE_DEFS) {
    if (!s.milestones[def.id] && def.achieved(s)) {
      if (
        def.id === 'vzornyDum' &&
        (s.meta.records.fastestVzornyTicks === null ||
          s.tick < s.meta.records.fastestVzornyTicks)
      ) {
        s = {
          ...s,
          meta: { ...s.meta, records: { ...s.meta.records, fastestVzornyTicks: s.tick } },
        };
      }
      const reward = MILESTONE_REWARDS[def.id];
      const bony = MILESTONE_BONY[def.id];
      s = {
        ...s,
        milestones: { ...s.milestones, [def.id]: true },
        money: s.money + reward,
        totalEarned: s.totalEarned + reward,
        bony: s.bony + bony,
        reputation: clamp(s.reputation + REP_MILESTONE, 0, 100),
      };
      s = addLog(
        s,
        'milestone',
        `${CS.milestones[def.id].toast} ${CS.ui.milestoneReward(formatKcs(reward))}`,
      );
      if (bony > 0) s = addLog(s, 'good', CS.toasts.bonyAwarded(bony));
    }
  }
  return s;
}

interface BadgeDef {
  id: BadgeId;
  achieved: (s: GameState) => boolean;
}

/** Kádrový posudek — earned once, kept through every privatizace. */
const BADGE_DEFS: readonly BadgeDef[] = [
  { id: 'udernik', achieved: (s) => s.stats.brigadeClicks >= UDERNIK_CLICKS },
  { id: 'provereny', achieved: (s) => s.stats.stbVisits >= PROVERENY_STB_VISITS },
  {
    id: 'plnyDum',
    achieved: (s) => {
      const b = mainBuilding(s);
      return occupiedIn(b) >= MAX_FLOORS * FLATS_PER_FLOOR;
    },
  },
  { id: 'milionar', achieved: (s) => s.totalEarned >= MILIONAR_EARNED },
  { id: 'prezimoval', achieved: (s) => dateFromTick(s.tick).month === 3 },
  { id: 'budovatel', achieved: (s) => s.buildings.length >= BUILDINGS_BASE },
  { id: 'vzorny', achieved: (s) => s.milestones.vzornyDum },
  { id: 'kapitalista', achieved: (s) => s.meta.prestigeLevel >= 1 },
  { id: 'slusnyClovek', achieved: (s) => s.stats.covered >= SLUSNY_CLOVEK_COVERED },
  { id: 'konfident', achieved: (s) => s.stats.reported >= KONFIDENT_REPORTED },
];

function checkBadges(s: GameState): GameState {
  for (const def of BADGE_DEFS) {
    if (!s.meta.badges[def.id] && def.achieved(s)) {
      s = {
        ...s,
        meta: {
          ...s.meta,
          badges: { ...s.meta.badges, [def.id]: true },
          kupony: s.meta.kupony + BADGE_KUPON_REWARD,
          records: {
            ...s.meta.records,
            kuponyEarnedTotal: s.meta.records.kuponyEarnedTotal + BADGE_KUPON_REWARD,
          },
        },
      };
      s = addLog(s, 'milestone', CS.badges[def.id].toast);
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
    // Elán roste s tím, jak se domu daří (spokojenost + důvěra).
    energy: Math.min(
      BRIGADE_ENERGY_MAX,
      prev.energy + brigadeRegen(avgHappiness(prev), prev.reputation),
    ),
    // Obě osy pověsti pomalu šednou k průměru — udržet si jméno dá práci.
    reputation: clamp(driftToward50(prev.reputation), 0, 100),
    regime: regimeFell(prev.tick) ? prev.regime : clamp(driftToward50(prev.regime), 0, 100),
  };

  s = updateHappiness(s);
  s = collectRent(s);
  s = processMoveOuts(s);
  s = processEvictions(s);
  s = processArrests(s);
  s = processMoveIns(s, rng);
  s = processBreakdowns(s, rng);
  s = processQuirks(s, rng);
  s = processCaretaker(s, rng);
  s = processBony(s, rng);
  s = processCalendar(s, rng);
  s = processPlan(s, rng);
  s = processEvents(s, rng);
  s = checkMilestones(s);
  s = checkBadges(s);

  return { ...s, rngSeed: rng.state() };
}
