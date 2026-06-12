// All cost curves, rates and tuning constants live here — single tuning point.
// Numbers target: first upgrade ~30 s, first new floor ~2-3 min, full 8-floor
// building in ~2-3 hours of mixed active/idle play (spec §5).

import type {
  Building,
  CourtyardId,
  Flat,
  GameState,
  MilestoneId,
  ProblemId,
  Tenant,
  TuzexId,
  UpgradeId,
} from './types';
import { ARCHETYPES } from './tenants';

// --- Building ---------------------------------------------------------------

export const MAX_FLOORS = 8;
export const FLATS_PER_FLOOR = 2;

export const FLOOR_BASE_COST = 500;
export const FLOOR_COST_GROWTH = 2.2;

/**
 * Cost of the next floor when the building already has `ownedFloors`.
 * Spec formula floorCost(n) = 500 * 2.2^n, with n counting *bought* floors —
 * the starting floor is free, so the first purchase is n = 0 → 500 Kčs.
 */
export function floorCost(ownedFloors: number): number {
  return Math.round(FLOOR_BASE_COST * Math.pow(FLOOR_COST_GROWTH, ownedFloors - 1));
}

// --- Money ------------------------------------------------------------------

export const STARTING_MONEY = 150;
export const BASE_RENT_PER_SEC = 1;
/** Rent factor at zero happiness — the no-dead-state trickle (spec §6.2). */
export const HAPPINESS_RENT_FLOOR = 0.2;

export function rentPerSec(rentMult: number, happiness: number): number {
  const happinessFactor =
    HAPPINESS_RENT_FLOOR + (1 - HAPPINESS_RENT_FLOOR) * (happiness / 100);
  return BASE_RENT_PER_SEC * rentMult * happinessFactor;
}

export function tenantRentPerSec(tenant: Tenant): number {
  return rentPerSec(ARCHETYPES[tenant.archetype].rentMult, tenant.happiness);
}

/** Rent of one flat including courtyard synergies (garage × vekslák). */
export function flatRentPerSec(state: GameState, flat: Flat): number {
  if (!flat.tenant) return 0;
  let rent = tenantRentPerSec(flat.tenant);
  if (state.courtyard.garaz && flat.tenant.archetype === 'vekslak') {
    rent *= GARAGE_VEKSLAK_MULT;
  }
  return rent;
}

/** Current income per second of the whole building, including upgrades. */
export function incomePerSec(state: GameState): number {
  const mult = state.upgrades.cellar ? CELLAR_RENT_MULT : 1;
  let sum = 0;
  for (const flat of state.buildings[0].flats) {
    sum += flatRentPerSec(state, flat);
  }
  return sum * mult;
}

// --- Happiness --------------------------------------------------------------

export const HAPPINESS_BASE_TARGET = 70;
/** Fraction of (target − current) applied per second. */
export const HAPPINESS_DRIFT_RATE = 0.02;
export const ELEVATOR_DECAY_MULT = 3; // broken elevator: floors 3+ decay 3× faster
export const ELEVATOR_BROKEN_TARGET_PENALTY = 45;
export const COUPLE_ELEVATOR_EXTRA_PENALTY = 15;
export const HOT_WATER_TARGET_PENALTY = 40;
export const PENSIONER_NEIGHBOR_DRAG = 5;
export const SVAZAK_NEIGHBOR_DRAG = 5;
export const MUSICIAN_NEIGHBOR_DRAG = 3;
export const FAMILY_HOT_WATER_EXTRA = 20;
export const SATELLITE_TARGET_BONUS = 20;
export const LAUNDRY_REGEN_MULT = 1.6;

// Courtyard happiness effects
export const ZAHONKY_TARGET_BONUS = 3;
export const SUSAK_TARGET_BONUS = 2;
export const PISKOVISTE_FAMILY_BONUS = 10;
export const LAVICKY_PENSIONER_BONUS = 10;

// --- Tenants ----------------------------------------------------------------

export const STARTING_REPUTATION = 50;
export const TENANT_STARTING_HAPPINESS = 60;
/** Per vacant flat per second at reputation 50 → ~10 % per 10 s (spec §6.3). */
export const MOVE_IN_BASE_CHANCE = 0.01;

export function moveInChance(reputation: number): number {
  return MOVE_IN_BASE_CHANCE * (0.5 + reputation / 100);
}

export const MOVE_OUT_HAPPINESS_THRESHOLD = 20;
export const MOVE_OUT_GRACE_SECONDS = 60;

/**
 * The waiting list (pořadník) is long — while the house is nearly empty,
 * flats fill faster. Keeps the first minutes of a fresh game lively.
 */
export const EARLY_MOVE_IN_BOOST = 2;
export const EARLY_MOVE_IN_MAX_OCCUPIED = 4;

export const REP_MOVE_IN = 1;
export const REP_MOVE_OUT = -5;
export const REP_MILESTONE = 3;

// --- Akce Z (active work for impatient comrades) -----------------------------

export const BRIGADE_ENERGY_MAX = 100;
export const BRIGADE_ENERGY_COST = 10;
/** Per second → a sustained click every 2.5 s, or a burst of 10 from full elán. */
export const BRIGADE_ENERGY_REGEN = 4;

export function brigadeReward(floors: number): number {
  return 3 + floors;
}

// --- Breakdowns -------------------------------------------------------------

export const ELEVATOR_MIN_FLOORS = 3;
/** Per second → mean time to breakdown ~5 min (spec §6.4). */
export const ELEVATOR_BREAK_CHANCE = 1 / 300;
export const ELEVATOR_NDR_BREAK_MULT = 0.5;

export function elevatorRepairCost(floors: number): number {
  return 60 + floors * 20;
}

/** Building-wide leak rate (one roll per second) → mean ~4 min between leaks. */
export const LEAK_CHANCE = 1 / 240;

/** Per-flat problems: repair price and how hard they sit on the mood. */
export const PROBLEM_DEFS: Record<ProblemId, { repairCost: number; targetPenalty: number }> = {
  leak: { repairCost: 40, targetPenalty: 30 },
  window: { repairCost: 25, targetPenalty: 20 },
  radiator: { repairCost: 35, targetPenalty: 25 },
};

// --- Calendar effects (zima / léto) -------------------------------------------

/** Heating drain per floor per second during the topná sezóna. */
export const HEATING_COST_PER_FLOOR = 0.15;
export const WINTER_TARGET_PENALTY = 5;
export const SUMMER_TARGET_BONUS = 3;
/** Winter-only radiator failures, building-wide roll → mean ~5 min. */
export const RADIATOR_CHANCE = 1 / 300;
/** The annual planned July outage. Duration in seconds. */
export const ODSTAVKA_DURATION = 180;
export const VANOCE_HAPPINESS_BONUS = 15;
export const MAJ_DECORATION_COST = 40;
export const REP_MAJ_DECORATED = 6;
export const REP_MAJ_SKIPPED = -6;

// --- Eviction (výpověď) ---------------------------------------------------------

export const EVICTION_COST = 150;
export const REP_EVICTION = -8;
/** The "řízení" takes a while — the neighbour stays and grumbles meanwhile. */
export const EVICTION_DELAY_SECONDS = 60;

// --- Bony & Tuzex ----------------------------------------------------------------

/** A vekslák leaves an envelope roughly once per 5 minutes. */
export const VEKSLAK_BON_CHANCE = 1 / 300;
export const TETA_BONY = 2;

export const MILESTONE_BONY: Record<MilestoneId, number> = {
  firstFullFloor: 0,
  first1000: 1,
  elevatorInstalled: 2,
  eightFloors: 3,
  vzornyDum: 5,
};

export const TUZEX_COSTS: Record<TuzexId, number> = {
  tv: 5,
  pracka: 4,
  digitalky: 3,
};

export const KAVA_COST_BONY = 2;
export const KAVA_HAPPINESS_BONUS = 15;
export const TV_TARGET_BONUS = 10;
/** Western washing machine: laundry regen 1.6 → 2.0. */
export const LAUNDRY_REGEN_MULT_WEST = 2.0;
export const DIGITALKY_FIX_MULT = 2;

// --- Domovník (pan Fanda) -----------------------------------------------------

export const CARETAKER_MIN_FLOORS = 3;
export const CARETAKER_WAGE_PER_SEC = 1.5;
/** Per problem per second → he gets to it in ~25 s. Most of the time. */
export const CARETAKER_FIX_CHANCE = 1 / 25;

// --- Tenant quirks --------------------------------------------------------------

/** Kutil notices a leak roughly once per two minutes and fixes it for free. */
export const KUTIL_FIX_CHANCE = 1 / 120;
export const DISIDENT_LOYALTY_SECONDS = 1800;
export const DISIDENT_LOYALTY_REP = 15;
export const MUSICIAN_MOVE_IN_REP = 5;
export const GARAGE_VEKSLAK_MULT = 1.2;

// --- Events -----------------------------------------------------------------

/** Per second → roughly one event per 90–150 s of play (spec §6.5). */
export const EVENT_CHANCE = 1 / 120;
/** No events during the first moments of a fresh game. */
export const EVENT_GRACE_SECONDS = 45;

export const KSC_FINE_RATE = 0.1;
export const KSC_FINE_MIN = 20;
export const KSC_FINE_MAX = 500;
export const REP_KSC_PRAISE = 8;
export const REP_KSC_FINE = -5;

export const STB_FEE_RATE = 0.15;
export const STB_FEE_MIN = 10;
export const STB_FEE_MAX = 1000;

export const MEJDAN_HAPPINESS_HIT = 25;

export const BANANAS_HAPPINESS_BONUS = 15;
export const REP_BANANAS = 2;

export const JITRNICE_HAPPINESS_BONUS = 10;

export const SCHUZE_COST = 50;
export const SCHUZE_PAY_BONUS = 12;
export const SCHUZE_SKIP_PENALTY = 6;

export const SATELLITE_FINE = 200;

// --- Upgrades ---------------------------------------------------------------

export const UPGRADE_COSTS: Record<UpgradeId, number> = {
  cellar: 150,
  laundry: 400,
  elevatorNdr: 600,
  satellite: 800,
};

export const CELLAR_RENT_MULT = 1.1;

// --- Courtyard (dvorek) --------------------------------------------------------

export const COURTYARD_COSTS: Record<CourtyardId, number> = {
  susak: 200,
  lavicky: 250,
  piskoviste: 300,
  zahonky: 350,
  garaz: 1000,
};

export const AZOR_SEARCH_COST = 30;
export const AZOR_FOUND_BONUS = 8;
export const AZOR_SKIP_PENSIONER_HIT = 10;
export const REP_AZOR_SKIP = -2;
export const RAJCATA_BONUS = 10;
export const ZLODEJ_PENSIONER_HIT = 10;
export const REP_ZLODEJ = -2;
export const REP_TRABANT = -2;
export const VRTANI_HIT = 15;

// --- Milestones -------------------------------------------------------------

export const VZORNY_DUM_HAPPINESS = 80;

/** Cash bonus from OPBH for each milestone — early goals pay for themselves. */
export const MILESTONE_REWARDS: Record<MilestoneId, number> = {
  firstFullFloor: 100,
  first1000: 150,
  elevatorInstalled: 250,
  eightFloors: 500,
  vzornyDum: 1000,
};

// --- Display helpers (Czech number formatting) -------------------------------

const NBSP = '\u00a0';

export function formatNumberCs(n: number, decimals = 0): string {
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, frac] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const sign = n < 0 ? '−' : '';
  return frac ? `${sign}${grouped},${frac}` : `${sign}${grouped}`;
}

export function formatKcs(n: number): string {
  return `${formatNumberCs(Math.floor(n))}${NBSP}Kčs`;
}

export function formatKcsPerSec(n: number): string {
  return `${formatNumberCs(n, 1)}${NBSP}Kčs/s`;
}

export function isElevatorRelevant(building: Building): boolean {
  return building.floors >= ELEVATOR_MIN_FLOORS;
}
