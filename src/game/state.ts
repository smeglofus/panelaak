// Initial state factory and small pure helpers shared by tick.ts and events.ts.

import type {
  ArchetypeId,
  Building,
  Flat,
  GameState,
  LogKind,
  Tenant,
} from './types';
import { createRng } from './rng';
import { createTenant } from './tenants';
import {
  BRIGADE_ENERGY_COST,
  BRIGADE_ENERGY_MAX,
  brigadeReward,
  STARTING_MONEY,
  STARTING_REPUTATION,
  TENANT_STARTING_HAPPINESS,
} from './economy';

export const SAVE_VERSION = 3;

const LOG_CAP = 50;

export function createFlat(index: number, floor: number): Flat {
  return { index, floor, tenant: null, problem: null };
}

export function createInitialState(seed?: number): GameState {
  const rngSeed = (seed ?? (Date.now() ^ Math.floor(Math.random() * 0xffffffff))) >>> 0;
  const rng = createRng(rngSeed);

  // Start with one floor, two flats, and one reliable tenant already home —
  // the game must feel alive within the first minute (spec §2).
  const flats = [createFlat(0, 1), createFlat(1, 1)];
  flats[0].tenant = createTenant(rng, 1, TENANT_STARTING_HAPPINESS + 10, 0, 'shift');

  const building: Building = { floors: 1, flats, elevatorBroken: false };

  return {
    version: SAVE_VERSION,
    tick: 0,
    rngSeed: rng.state(),
    money: STARTING_MONEY,
    totalEarned: 0,
    reputation: STARTING_REPUTATION,
    energy: BRIGADE_ENERGY_MAX,
    buildings: [building],
    meta: { prestigeLevel: 0 },
    upgrades: { elevatorNdr: false, cellar: false, satellite: false, laundry: false },
    courtyard: { piskoviste: false, lavicky: false, zahonky: false, susak: false, garaz: false },
    caretakerHired: false,
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
    stats: { moveIns: 0, moveOuts: 0, eventsFired: 0, breakdowns: 0 },
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
  const tenants = mainBuilding(s).flats.filter((f) => f.tenant);
  if (tenants.length === 0) return 0;
  return tenants.reduce((sum, f) => sum + f.tenant!.happiness, 0) / tenants.length;
}

export function occupiedCount(s: GameState): number {
  return mainBuilding(s).flats.filter((f) => f.tenant).length;
}

export function isEventActive(s: GameState, id: string): boolean {
  return s.activeEvents.some((e) => e.id === id);
}

export function hasArchetype(s: GameState, archetype: ArchetypeId): boolean {
  return mainBuilding(s).flats.some((f) => f.tenant?.archetype === archetype);
}

/** Immutably transform every tenant in the building. */
export function mapTenants(
  s: GameState,
  fn: (tenant: Tenant, flat: Flat) => Tenant,
): GameState {
  const b = mainBuilding(s);
  const flats = b.flats.map((f) => (f.tenant ? { ...f, tenant: fn(f.tenant, f) } : f));
  return { ...s, buildings: [{ ...b, flats }] };
}

/** Immutably replace a single flat by index. */
export function updateFlat(
  s: GameState,
  index: number,
  fn: (flat: Flat) => Flat,
): GameState {
  const b = mainBuilding(s);
  const flats = b.flats.map((f) => (f.index === index ? fn(f) : f));
  return { ...s, buildings: [{ ...b, flats }] };
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
  const reward = brigadeReward(mainBuilding(s).floors);
  return {
    ...s,
    energy: s.energy - BRIGADE_ENERGY_COST,
    money: s.money + reward,
    totalEarned: s.totalEarned + reward,
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
  return g;
}
