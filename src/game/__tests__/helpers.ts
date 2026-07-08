// Shared test fixtures: deterministic states and a deep-freeze purity guard.

import type { ArchetypeId, Building, Flat, GameState, Tenant } from '../types';
import { createInitialState, createFlat } from '../state';
import { FLATS_PER_FLOOR } from '../economy';

export const TEST_SEED = 42;

export function freshState(seed: number = TEST_SEED): GameState {
  return createInitialState(seed);
}

/** Replace the buildings with a single `floors`-floor building of empty flats. */
export function withFloors(s: GameState, floors: number): GameState {
  const flats: Flat[] = [];
  for (let floor = 1; floor <= floors; floor++) {
    for (let i = 0; i < FLATS_PER_FLOOR; i++) {
      flats.push(createFlat(flats.length, floor, 0));
    }
  }
  const building: Building = { floors, flats, elevatorBroken: false, site: 0 };
  return { ...s, buildings: [building] };
}

/** Append a second building on the given site with empty flats. */
export function withSecondBuilding(s: GameState, site: number, floors = 1): GameState {
  const start = s.buildings.flatMap((b) => b.flats).length;
  const bIdx = s.buildings.length;
  const flats: Flat[] = [];
  for (let floor = 1; floor <= floors; floor++) {
    for (let i = 0; i < FLATS_PER_FLOOR; i++) {
      flats.push(createFlat(start + flats.length, floor, bIdx));
    }
  }
  const building: Building = { floors, flats, elevatorBroken: false, site };
  return { ...s, buildings: [...s.buildings, building] };
}

export function makeTenant(overrides: Partial<Tenant> & { archetype?: ArchetypeId } = {}): Tenant {
  return {
    id: 999,
    archetype: 'shift',
    name: 'Testovací soudruh',
    flavor: '„Testuju.“',
    happiness: 70,
    unhappySince: null,
    movedInAt: 0,
    quirkDone: false,
    evictionAt: null,
    ...overrides,
  };
}

export function withTenant(
  s: GameState,
  flatIndex: number,
  overrides: Partial<Tenant> & { archetype?: ArchetypeId } = {},
): GameState {
  const b = s.buildings[0];
  const flats = b.flats.map((f) =>
    f.index === flatIndex ? { ...f, tenant: makeTenant({ id: 1000 + flatIndex, ...overrides }) } : f,
  );
  return { ...s, buildings: [{ ...b, flats }] };
}

export function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const value of Object.values(obj)) deepFreeze(value);
  }
  return obj;
}
