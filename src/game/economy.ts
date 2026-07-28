// All cost curves, rates and tuning constants live here — single tuning point.
// Numbers target: first upgrade ~30 s, first new floor ~2-3 min, full 8-floor
// building in ~2-3 hours of mixed active/idle play (spec §5).

import type {
  Building,
  CourtyardId,
  Flat,
  GameState,
  MilestoneId,
  MinigameId,
  PerkId,
  ProblemId,
  ProjectId,
  RepeatableId,
  Tenant,
  TuzexId,
  UpgradeId,
} from './types';
import { ARCHETYPES } from './tenants';
import { regimeFell } from './calendar';

// --- Building ---------------------------------------------------------------

export const MAX_FLOORS = 8;
export const FLATS_PER_FLOOR = 2;

export const FLOOR_BASE_COST = 500;
export const FLOOR_COST_GROWTH = 2.2;

/**
 * Cost of the next floor when the building already has `ownedFloors`.
 * Spec formula floorCost(n) = 500 * 2.2^n, with n counting *bought* floors —
 * the starting floor is free, so the first purchase is n = 0 → 500 Kčs.
 * The "lepší beton" perk shaves the price a bit per level.
 */
export function floorCost(ownedFloors: number, betonLevel = 0): number {
  const discount = 1 - BETON_DISCOUNT * betonLevel;
  return Math.round(FLOOR_BASE_COST * Math.pow(FLOOR_COST_GROWTH, ownedFloors - 1) * discount);
}

// --- Sídliště (multiple buildings) ---------------------------------------------

export interface SiteDef {
  /** Rent multiplier for tenants living there. */
  rentMult: number;
  /** Happiness target shift for the whole building. */
  targetDelta: number;
  /** Move-in chance multiplier. */
  moveInMult: number;
}

/**
 * The ten parcels of the sídliště, by Building.site index. The správce picks
 * which one to build on; each trades rent, mood and how fast the pořadník moves.
 * The first three keep their historic tuning (older saves reference them by
 * index). Flavor lives in content.cs.ts.
 */
export const SITES: readonly SiteDef[] = [
  { rentMult: 1, targetDelta: 0, moveInMult: 1 }, // 0 Jiráskova — the original
  { rentMult: 1.15, targetDelta: -5, moveInMult: 1.1 }, // 1 U Fabriky — smoke, but jobs
  { rentMult: 0.95, targetDelta: 8, moveInMult: 0.8 }, // 2 U Lesa — quiet, remote
  { rentMult: 1.2, targetDelta: -4, moveInMult: 1.3 }, // 3 Náměstí Míru — central, busy
  { rentMult: 1.1, targetDelta: -8, moveInMult: 1.35 }, // 4 U Nádraží — transport, noise
  { rentMult: 1.05, targetDelta: 8, moveInMult: 0.8 }, // 5 Na Kopci — air & view, uphill
  { rentMult: 0.9, targetDelta: 14, moveInMult: 0.75 }, // 6 U Přehrady — recreation, remote
  { rentMult: 1.35, targetDelta: -14, moveInMult: 0.95 }, // 7 Průmyslová zóna — rich, grim
  { rentMult: 1.25, targetDelta: 5, moveInMult: 0.7 }, // 8 Staré Město — prestige, hard to fill
  { rentMult: 0.85, targetDelta: 12, moveInMult: 0.65 }, // 9 Na Periferii — cheap, calm, isolated
];

/** Total parcels on the map — the hard ceiling on how many houses can exist. */
export const TOTAL_PARCELS = SITES.length;

/** Houses buildable in the first era; each era (privatizace) unlocks one more. */
export const BUILDINGS_BASE = 3;

/** How many houses the správce may own at the given prestige (éra) level. */
export function buildingCap(prestigeLevel: number): number {
  return Math.min(TOTAL_PARCELS, BUILDINGS_BASE + prestigeLevel);
}

// The první dům is free (the starting one). Each further plot costs more.
export const PLOT_BASE_COST = 25000;
export const PLOT_COST_GROWTH = 3;

/** Price of a new plot when the správce already owns `ownedCount` houses. */
export function plotCost(ownedCount: number): number {
  if (ownedCount < 1) return 0;
  return Math.round(PLOT_BASE_COST * Math.pow(PLOT_COST_GROWTH, ownedCount - 1));
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

/** Rent of one flat including site, renovation and courtyard synergies. */
export function flatRentPerSec(state: GameState, flat: Flat): number {
  if (!flat.tenant) return 0;
  let rent = tenantRentPerSec(flat.tenant);
  rent *= SITES[state.buildings[flat.bldg]?.site ?? 0].rentMult;
  rent *= 1 + FLAT_RENO_RENT_BONUS * flat.renovation;
  if (state.courtyard.garaz && flat.tenant.archetype === 'vekslak') {
    rent *= GARAGE_VEKSLAK_MULT;
  }
  return rent;
}

/** Current income per second of the whole sídliště, including upgrades. */
export function incomePerSec(state: GameState): number {
  let mult = state.upgrades.cellar ? CELLAR_RENT_MULT : 1;
  mult *= 1 + RENOVACE_RENT_BONUS * state.repeatables.renovace;
  mult *= 1 + PRESTIGE_RENT_BONUS * state.meta.prestigeLevel;
  mult *= 1 + TUZEX_BALIK_RENT_BONUS * (state.baliky ?? 0);
  let sum = 0;
  for (const building of state.buildings) {
    for (const flat of building.flats) {
      sum += flatRentPerSec(state, flat);
    }
  }
  return sum * mult;
}

// --- Happiness --------------------------------------------------------------

export const HAPPINESS_BASE_TARGET = 70;
/**
 * Diminishing returns on comfort: positive factors add up in full only to the
 * knee; beyond it each point counts for this fraction. Tenants get used to the
 * good life — the surplus shows on the card as „vysoké nároky“. Keeps late-game
 * moods honest instead of parked at 100 with every debuff swallowed by the cap.
 */
export const COMFORT_KNEE = 12;
export const COMFORT_EXCESS_KEPT = 0.35;

export function comfortExcessLoss(positiveSum: number): number {
  if (positiveSum <= COMFORT_KNEE) return 0;
  return Math.round((positiveSum - COMFORT_KNEE) * (1 - COMFORT_EXCESS_KEPT));
}
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

/**
 * Both standing meters (důvěra i kádrový profil) slowly sag toward the grey
 * average of 50 — a good name has to be maintained, a bad one is forgotten.
 * Fraction of (50 − value) applied per second.
 */
export const STANDING_DRIFT_RATE = 0.0002;

export function driftToward50(value: number): number {
  return value + (50 - value) * STANDING_DRIFT_RATE;
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
/**
 * Elán roste s tím, jak se domu daří: base + share for average happiness +
 * share for důvěra sousedů. At a so-so house (avg 60, důvěra 50) this lands
 * on the historic flat rate of ~4/s; a thriving dům pushes ~6, a miserable
 * one drags toward 1.5 — but never stalls (no dead state).
 */
export const BRIGADE_REGEN_BASE = 1.5;
export const BRIGADE_REGEN_HAPPY_SHARE = 3.5;
export const BRIGADE_REGEN_TRUST_SHARE = 1.0;

export function brigadeRegen(avgHappiness: number, reputation: number): number {
  return (
    BRIGADE_REGEN_BASE +
    BRIGADE_REGEN_HAPPY_SHARE * (avgHappiness / 100) +
    BRIGADE_REGEN_TRUST_SHARE * (reputation / 100)
  );
}

export function brigadeReward(floors: number, naradiLevel = 0, rucickyLevel = 0): number {
  return 3 + floors + NARADI_REWARD_BONUS * naradiLevel + RUCICKY_BONUS * rucickyLevel;
}

// --- Svazákova arkáda (byrokratický tetris) ----------------------------------
// Minihra u svazáka: uklízíš papíry do řádků jako správný funkcionář. Stojí
// elán (jako brigáda), za skóre kápne pár korun z „fondu kulturního vyžití".

/** Elán spent to sit down for one game. */
export const ARKADA_ENERGY_COST = 30;
/** Kčs paid per point of score. */
export const ARKADA_MONEY_PER_POINT = 0.1;
/** The výbor never pays more than this for one game, however good you are. */
export const ARKADA_MAX_REWARD = 400;

export function arkadaReward(score: number): number {
  return Math.min(ARKADA_MAX_REWARD, Math.round(score * ARKADA_MONEY_PER_POINT));
}

// --- Kutilovo potrubí ----------------------------------------------------------

export const POTRUBI_ENERGY_COST = 20;
/** Solving it in few turns pays better; a fumbled solve still covers the trip. */
export const POTRUBI_BASE_REWARD = 300;
export const POTRUBI_MIN_REWARD = 60;
export const POTRUBI_PER_MOVE_PENALTY = 8;

export function potrubiReward(moves: number): number {
  return Math.max(POTRUBI_MIN_REWARD, POTRUBI_BASE_REWARD - POTRUBI_PER_MOVE_PENALTY * moves);
}

// --- Azor na obchůzce ----------------------------------------------------------

export const AZOR_ENERGY_COST = 25;
/** Paid per cat rounded up in the courtyard. */
export const AZOR_MONEY_PER_CAT = 45;

export function azorReward(cats: number): number {
  return AZOR_MONEY_PER_CAT * cats;
}

// --- Repeatable upgrades (the endless money sink) ------------------------------

export const RENOVACE_RENT_BONUS = 0.05;
export const NARADI_REWARD_BONUS = 2;

const REPEATABLE_BASE: Record<RepeatableId, { base: number; growth: number }> = {
  renovace: { base: 1200, growth: 1.8 },
  naradi: { base: 300, growth: 1.6 },
};

export function repeatableCost(id: RepeatableId, ownedLevels: number): number {
  const def = REPEATABLE_BASE[id];
  return Math.round(def.base * Math.pow(def.growth, ownedLevels));
}

// --- Privatizace (prestige) ------------------------------------------------------

/** Prestige unlocks once the calendar reaches this year. Doba se změnila. */
export const PRIVATIZACE_YEAR = 1990;
/** Each éra adds a permanent rent bonus. */
export const PRESTIGE_RENT_BONUS = 0.05;

export const PERK_COSTS: Record<PerkId, number> = {
  beton: 3,
  konexe: 3,
  stribro: 2,
  povest: 2,
  rucicky: 2,
};

export const PERK_MAX: Record<PerkId, number> = {
  beton: 10,
  konexe: 5,
  stribro: 10,
  povest: 6,
  rucicky: 10,
};

export const BETON_DISCOUNT = 0.04;
export const KONEXE_DISCOUNT = 0.1;
export const STRIBRO_START_MONEY = 500;
export const POVEST_START_REP = 5;
export const RUCICKY_BONUS = 3;

/** Fines and "fees" get milder with konexe na výboru — and with a good kádrový
 * profil. A bad profile makes every kontrola pricier. After the revolution the
 * profile stops entering the math. */
export function fineMult(state: GameState): number {
  const konexe = Math.max(0.5, 1 - KONEXE_DISCOUNT * state.meta.perks.konexe);
  if (regimeFell(state.tick)) return konexe;
  const profile = Math.min(
    1.4,
    Math.max(0.6, REGIME_FINE_BASE - REGIME_FINE_SLOPE * state.regime),
  );
  return konexe * profile;
}

// --- Kádrový profil (the regime axis) ------------------------------------------

export const STARTING_REGIME = 50;
/** fineMult factor = base − slope·regime → 1.4× at profile 0, 0.6× at 100. */
export const REGIME_FINE_BASE = 1.4;
export const REGIME_FINE_SLOPE = 0.008;
/** ONV allocates flats: the pořadník moves faster for well-profiled správci. */
export const REGIME_MOVE_IN_MIN = 0.7;
export const REGIME_MOVE_IN_MAX = 1.3;

export function regimeMoveInMult(regime: number, fell: boolean): number {
  if (fell) return 1;
  return REGIME_MOVE_IN_MIN + (REGIME_MOVE_IN_MAX - REGIME_MOVE_IN_MIN) * (regime / 100);
}

/** Plnění plánu těší výbor; neplnění se píše. */
export const REGIME_PLAN_DONE = 2;
export const REGIME_PLAN_FAIL = -3;

// --- Rekonstrukce bytů (per-flat renovation) ---------------------------------------

export const FLAT_RENO_MAX = 3;
/** Cost of upgrading FROM the given level (index 0 = level 0 → 1). */
export const FLAT_RENO_COSTS = [800, 1800, 4000];
export const FLAT_RENO_RENT_BONUS = 0.08;
export const FLAT_RENO_TARGET_BONUS = 5;

export function flatRenoCost(currentLevel: number): number {
  return FLAT_RENO_COSTS[currentLevel] ?? Infinity;
}

// --- Výstavba sídliště (mega-projects) ----------------------------------------------

export const PROJECT_COSTS: Record<ProjectId, number> = {
  samoobsluha: 150000,
  skolka: 600000,
  kulturak: 2500000,
};

/** Sequential unlock order. */
export const PROJECT_ORDER: readonly ProjectId[] = ['samoobsluha', 'skolka', 'kulturak'];

export const SAMOOBSLUHA_TARGET_BONUS = 4;
export const SKOLKA_FAMILY_BONUS = 12;
export const SKOLKA_MOVE_IN_MULT = 1.15;
export const KULTURAK_TARGET_BONUS = 8;
/** The kulturní dům drops a bon this often (seconds). */
export const KULTURAK_BON_INTERVAL = 240;

// --- Pětiletka (rotating plans) ------------------------------------------------------

/** Pause between plans, seconds. */
export const PLAN_COOLDOWN = 60;
/** First plan arrives after this many ticks of a fresh era. */
export const PLAN_FIRST_AT = 120;
export const PLAN_HAPPY_THRESHOLD = 75;
/** Chance a plan carries a kupón on top of the usual reward. */
export const PLAN_KUPON_CHANCE = 0.25;
/**
 * A "fix N things" plan is unwinnable if nothing happens to break. While one
 * runs and the player has fewer outstanding repairs than the plan still needs,
 * let something break on this cadence (seconds) so the quota always comes with
 * the work to meet it — up to the shortfall, never a flood.
 */
export const FIX_PLAN_SUPPLY_INTERVAL = 45;

// --- Kádrový posudek (badges) -----------------------------------------------------

/** Each badge pays this many kupóny, once, forever. */
export const BADGE_KUPON_REWARD = 1;
export const UDERNIK_CLICKS = 250;
export const PROVERENY_STB_VISITS = 5;
export const MILIONAR_EARNED = 1_000_000;
export const SLUSNY_CLOVEK_COVERED = 3;
export const KONFIDENT_REPORTED = 3;

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
export const REGIME_MAJ_DECORATED = 7;
export const REGIME_MAJ_SKIPPED = -7;

// --- Seasonal events (v0.9) ------------------------------------------------------

/** Havárie řadu: neteče vůbec nic. Target penalty while active. */
export const STUDENA_VODA_PENALTY = 35;
/** Letní vedro; panelák je akumulační kamna. */
export const VEDRO_PENALTY = 12;
export const VEDRO_PENSIONER_EXTRA = 8;
/** Zimní chřipková epidemie. */
export const CHRIPKA_PENALTY = 15;
/** Sněhová kalamita — brigáda stojí elán, ignorace náladu i důvěru. */
export const KALAMITA_ENERGY_COST = 30;
export const KALAMITA_SHOVELED_BONUS = 8;
export const REP_KALAMITA_SHOVELED = 3;
export const KALAMITA_SKIP_HIT = 8;
export const REP_KALAMITA_SKIP = -3;
/** Prosincové mandarinky v Jednotě. Vůně Vánoc a devizového obchodu. */
export const MANDARINKY_BONUS = 12;
export const REP_MANDARINKY = 2;
export const POMLAZKA_BONUS = 10;
export const BLATO_HIT = 6;
/** Podzimní brigáda na brambory — OV ji očekává, nájemníci nikoli. */
export const BRAMBORY_REGIME = 6;
export const BRAMBORY_HAPPINESS_HIT = 8;
export const BRAMBORY_SKIP_REGIME = -6;
export const POSVICENI_BONUS = 10;
export const POSVICENI_COST = 30;

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

// --- The bony sink ------------------------------------------------------------
// Three one-off goods (12 bony in total) used to be everything bony were for,
// while a mid-game house earns roughly forty an hour. These three sinks give
// them somewhere to go for good: a hamper that never stops costing more, a
// terrible exchange rate into kupóny, and the minigame unlocks below.

/** Repeatable Tuzex hamper: permanent rent bonus per level. */
export const TUZEX_BALIK_RENT_BONUS = 0.04;
export const TUZEX_BALIK_BASE_COST = 3;
export const TUZEX_BALIK_GROWTH = 1.45;

export function tuzexBalikCost(owned: number): number {
  return Math.max(3, Math.round(TUZEX_BALIK_BASE_COST * Math.pow(TUZEX_BALIK_GROWTH, owned)));
}

/**
 * Bony into privatizační kupóny, at a deliberately dreadful rate — the point is
 * that a late-game pile of bony is never quite worthless, not that it's a good
 * deal. Only unlocked once privatizace is on the table.
 */
export const BONY_PER_KUPON = 15;

/** One-time bony price of each unlockable diversion. */
export const MINIGAME_COSTS: Record<MinigameId, number> = {
  arkada: 0, // the svazák's arcade comes with the house
  potrubi: 8,
  azor: 12,
};
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
/** A bigger sídliště is a busier sídliště: +30 % event rate per extra building. */
export const EVENT_SIDLISTE_BONUS = 0.3;
/** No events during the first moments of a fresh game. */
export const EVENT_GRACE_SECONDS = 45;

// v0.6 events — volby, kontroly a 1. máj se zapisují do kádrového profilu
export const VOLBY_REGIME_GO = 5;
export const VOLBY_HAPPINESS_HIT = 3;
export const VOLBY_REGIME_SKIP = -9;
export const POUT_HAPPINESS_BONUS = 12;
export const POUT_COST = 20;
export const INVENTURA_HIT = 8;
export const STEHOVANI_HIT = 10;

export const KSC_FINE_RATE = 0.1;
export const KSC_FINE_MIN = 20;
export const KSC_FINE_MAX = 500;
export const REGIME_KSC_PRAISE = 8;
export const REGIME_KSC_FINE = -5;

export const STB_FEE_RATE = 0.15;
export const STB_FEE_MIN = 10;
export const STB_FEE_MAX = 1000;

export const MEJDAN_HAPPINESS_HIT = 25;

// --- Šmírování, svěřování, krytí a udávání (v0.9) --------------------------------

export const SPY_ENERGY_COST = 25;
/** Chance the snoop finds the secret (when there is one to find). */
export const SPY_DISCOVER_CHANCE = 0.55;
/** Chance the tenant catches the správce with an ear on the door. */
export const SPY_CAUGHT_CHANCE = 0.15;
export const SPY_CAUGHT_HAPPINESS_HIT = 10;
export const REP_SPY_CAUGHT = -5;

/** Tenants confide only when they're happy and the správce is trusted. */
export const CONFIDE_MIN_HAPPINESS = 70;
export const CONFIDE_MIN_REP = 55;
export const CONFIDE_TENANT_BONUS = 8;
export const REP_CONFIDE_ACCEPTED = 3;
export const CONFIDE_REFUSED_HIT = 5;

export const COVER_TENANT_BONUS = 15;
export const REP_COVER = 6;

/** Hlášení: the StB pays in profile points and a discreet envelope. */
export const REPORT_REGIME_BONUS = 12;
export const REPORT_BONY = 2;
/** Three game days between the hlášení and the 6:00 knock. */
export const ARREST_DELAY_SECONDS = 90;
export const ARREST_HOUSE_HAPPINESS_HIT = 10;
export const REP_ARREST = -8;
/** Betraying someone who confided in you costs extra when it comes out. */
export const REP_ARREST_CONFIDED_EXTRA = -6;

/** A covered tenant survives StB visits — but each visit risks exposing you. */
export const STB_COVER_BUST_CHANCE = 0.4;
export const REGIME_COVER_BUSTED = -15;
export const REP_COVER_HELD = 2;
export const COVER_HELD_TENANT_BONUS = 5;

/** Zapírat u výslechu něco stojí. */
export const REGIME_HLASENI_DENIED = -6;
/** The StB starts asking for hlášení only once the house has a life to report on. */
export const HLASENI_MIN_TICK = 600;

// --- Revoluce a lustrace ---------------------------------------------------------

/** Reports that brand the era's správce at the revolution and the lustrace. */
export const LUSTRACE_REPORTED_LIMIT = 3;
/** Cover at least this many (and report no one) for the morální kredit. */
export const LUSTRACE_COVERED_MIN = 2;
export const LUSTRACE_KUPON_BONUS = 3;
/** Kupóny kept by a správce whose podpisy se našly. */
export const LUSTRACE_PENALTY_MULT = 0.75;
export const REP_REVOLUTION_HERO = 12;
export const REP_REVOLUTION_MINOR = -8;
export const REP_REVOLUTION_TRAITOR = -20;

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

/** Compact duration: "2 h 05 min" or "7 min 30 s". */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const sec = Math.floor(seconds % 60);
  if (h > 0) return `${h}${NBSP}h${NBSP}${String(m).padStart(2, '0')}${NBSP}min`;
  return `${m}${NBSP}min${NBSP}${String(sec).padStart(2, '0')}${NBSP}s`;
}

export function isElevatorRelevant(building: Building): boolean {
  return building.floors >= ELEVATOR_MIN_FLOORS;
}
