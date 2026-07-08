// Initial state factory and small pure helpers shared by tick.ts and events.ts.

import type {
  ArchetypeId,
  Building,
  Flat,
  GameState,
  LogKind,
  Meta,
  Tenant,
} from './types';
import { createRng } from './rng';
import { createTenant } from './tenants';
import {
  BRIGADE_ENERGY_COST,
  BRIGADE_ENERGY_MAX,
  brigadeReward,
  POVEST_START_REP,
  STARTING_MONEY,
  STARTING_REPUTATION,
  STRIBRO_START_MONEY,
  TENANT_STARTING_HAPPINESS,
} from './economy';

export const SAVE_VERSION = 6;

export function createDefaultBadges(): Meta['badges'] {
  return {
    udernik: false,
    provereny: false,
    plnyDum: false,
    milionar: false,
    prezimoval: false,
    budovatel: false,
    vzorny: false,
    kapitalista: false,
  };
}

export function createDefaultMeta(): Meta {
  return {
    prestigeLevel: 0,
    kupony: 0,
    perks: { beton: 0, konexe: 0, stribro: 0, povest: 0, rucicky: 0 },
    badges: createDefaultBadges(),
  };
}

const LOG_CAP = 50;

export function createFlat(index: number, floor: number, bldg = 0): Flat {
  return { index, floor, bldg, tenant: null, problem: null };
}

/** A fresh 1-floor building on the given site; flat indices stay globally unique. */
export function createBuilding(site: number, bldgIndex: number, firstFlatIndex: number): Building {
  const flats = [
    createFlat(firstFlatIndex, 1, bldgIndex),
    createFlat(firstFlatIndex + 1, 1, bldgIndex),
  ];
  return { floors: 1, flats, elevatorBroken: false, site };
}

/** Every flat across the whole sídliště. */
export function allFlats(s: GameState): Flat[] {
  return s.buildings.flatMap((b) => b.flats);
}

export function totalFloors(s: GameState): number {
  return s.buildings.reduce((sum, b) => sum + b.floors, 0);
}

export function createInitialState(seed?: number, meta?: Meta): GameState {
  const rngSeed = (seed ?? (Date.now() ^ Math.floor(Math.random() * 0xffffffff))) >>> 0;
  const rng = createRng(rngSeed);
  const m = meta ?? createDefaultMeta();

  // Start with one floor, two flats, and one reliable tenant already home —
  // the game must feel alive within the first minute (spec §2).
  const building: Building = createBuilding(0, 0, 0);
  building.flats[0].tenant = createTenant(rng, 1, TENANT_STARTING_HAPPINESS + 10, 0, 'shift');

  return {
    version: SAVE_VERSION,
    tick: 0,
    rngSeed: rng.state(),
    // Rodinné stříbro and pověst perks improve every new start.
    money: STARTING_MONEY + STRIBRO_START_MONEY * m.perks.stribro,
    totalEarned: 0,
    reputation: Math.min(100, STARTING_REPUTATION + POVEST_START_REP * m.perks.povest),
    energy: BRIGADE_ENERGY_MAX,
    buildings: [building],
    meta: m,
    upgrades: { elevatorNdr: false, cellar: false, satellite: false, laundry: false },
    repeatables: { renovace: 0, naradi: 0 },
    courtyard: { piskoviste: false, lavicky: false, zahonky: false, susak: false, garaz: false },
    caretakerHired: false,
    bony: 0,
    tuzex: { tv: false, pracka: false, digitalky: false },
    activeEvents: [],
    pendingChoice: null,
    milestones: {
      firstFullFloor: false,
      first1000: false,
      elevatorInstalled: false,
      eightFloors: false,
      vzornyDum: false,
    },
    log: [],
    logSeq: 0,
    stats: {
      moveIns: 0,
      moveOuts: 0,
      eventsFired: 0,
      breakdowns: 0,
      brigadeClicks: 0,
      stbVisits: 0,
    },
    nextTenantId: 2,
    lastSaved: Date.now(),
  };
}

export function mainBuilding(s: GameState): Building {
  return s.buildings[0];
}

export function addLog(s: GameState, kind: LogKind, text: string): GameState {
  const seq = s.logSeq + 1;
  const entry = { seq, tick: s.tick, kind, text };
  return { ...s, logSeq: seq, log: [...s.log, entry].slice(-LOG_CAP) };
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function avgHappiness(s: GameState): number {
  const tenants = allFlats(s).filter((f) => f.tenant);
  if (tenants.length === 0) return 0;
  return tenants.reduce((sum, f) => sum + f.tenant!.happiness, 0) / tenants.length;
}

export function occupiedCount(s: GameState): number {
  return allFlats(s).filter((f) => f.tenant).length;
}

export function occupiedIn(b: Building): number {
  return b.flats.filter((f) => f.tenant).length;
}

export function isEventActive(s: GameState, id: string): boolean {
  return s.activeEvents.some((e) => e.id === id);
}

export function hasArchetype(s: GameState, archetype: ArchetypeId): boolean {
  return allFlats(s).some((f) => f.tenant?.archetype === archetype);
}

/** Immutably transform every tenant across the sídliště. */
export function mapTenants(
  s: GameState,
  fn: (tenant: Tenant, flat: Flat) => Tenant,
): GameState {
  const buildings = s.buildings.map((b) => ({
    ...b,
    flats: b.flats.map((f) => (f.tenant ? { ...f, tenant: fn(f.tenant, f) } : f)),
  }));
  return { ...s, buildings };
}

/** Immutably replace a single flat by its global index. */
export function updateFlat(
  s: GameState,
  index: number,
  fn: (flat: Flat) => Flat,
): GameState {
  const buildings = s.buildings.map((b) =>
    b.flats.some((f) => f.index === index)
      ? { ...b, flats: b.flats.map((f) => (f.index === index ? fn(f) : f)) }
      : b,
  );
  return { ...s, buildings };
}

export function vacateFlat(s: GameState, index: number): GameState {
  return updateFlat(s, index, (f) => ({ ...f, tenant: null }));
}

/**
 * Akce Z: one unit of voluntary-mandatory work. Spends elán, earns a few Kčs.
 * Returns the state unchanged when the comrade is out of energy.
 */
export function applyBrigadeWork(s: GameState): GameState {
  if (s.energy < BRIGADE_ENERGY_COST) return s;
  const reward = brigadeReward(totalFloors(s), s.repeatables.naradi, s.meta.perks.rucicky);
  return {
    ...s,
    energy: s.energy - BRIGADE_ENERGY_COST,
    money: s.money + reward,
    totalEarned: s.totalEarned + reward,
    stats: { ...s.stats, brigadeClicks: s.stats.brigadeClicks + 1 },
  };
}

/** Bring an older persisted save up to the current schema. */
export function migrateSave(game: GameState, fromVersion: number): GameState {
  let g = game;
  if (fromVersion < 2) {
    // v2 added the Akce Z energy pool.
    g = { ...g, version: 2, energy: BRIGADE_ENERGY_MAX };
  }
  if (fromVersion < 3) {
    // v3 added the courtyard, the caretaker and tenant tenure fields.
    g = {
      ...g,
      version: 3,
      courtyard: { piskoviste: false, lavicky: false, zahonky: false, susak: false, garaz: false },
      caretakerHired: false,
      buildings: g.buildings.map((b) => ({
        ...b,
        flats: b.flats.map((f) =>
          f.tenant
            ? {
                ...f,
                tenant: {
                  ...f.tenant,
                  movedInAt: f.tenant.movedInAt ?? 0,
                  quirkDone: f.tenant.quirkDone ?? false,
                },
              }
            : f,
        ),
      })),
    };
  }
  if (fromVersion < 4) {
    // v4 added the calendar era: bony/Tuzex and eviction proceedings.
    g = {
      ...g,
      version: 4,
      bony: g.bony ?? 0,
      tuzex: { tv: false, pracka: false, digitalky: false },
      buildings: g.buildings.map((b) => ({
        ...b,
        flats: b.flats.map((f) =>
          f.tenant
            ? { ...f, tenant: { ...f.tenant, evictionAt: f.tenant.evictionAt ?? null } }
            : f,
        ),
      })),
    };
  }
  if (fromVersion < 5) {
    // v5 added the privatizace era: meta perks/kupóny and repeatable upgrades.
    g = {
      ...g,
      version: 5,
      meta: {
        ...createDefaultMeta(),
        prestigeLevel: g.meta?.prestigeLevel ?? 0,
      },
      repeatables: { renovace: 0, naradi: 0 },
    };
  }
  if (fromVersion < 6) {
    // v6 added the sídliště (sites, per-flat building index) and badges.
    g = {
      ...g,
      version: 6,
      meta: {
        ...g.meta,
        badges: g.meta.badges ?? createDefaultBadges(),
      },
      stats: {
        ...g.stats,
        brigadeClicks: g.stats.brigadeClicks ?? 0,
        stbVisits: g.stats.stbVisits ?? 0,
      },
      buildings: g.buildings.map((b, bi) => ({
        ...b,
        site: b.site ?? bi,
        flats: b.flats.map((f) => ({ ...f, bldg: f.bldg ?? bi })),
      })),
    };
  }
  return g;
}
