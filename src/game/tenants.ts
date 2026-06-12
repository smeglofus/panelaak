// Tenant archetype definitions and move-in logic (spec §6.3).

import type { ArchetypeId, Tenant } from './types';
import type { Rng } from './rng';
import { CS } from './content.cs';

export interface ArchetypeDef {
  id: ArchetypeId;
  rentMult: number;
  /** Relative move-in weight. */
  weight: number;
  /** Quirk summary — behaviour itself lives in tick.ts / events.ts. */
  quirk: string;
}

export const ARCHETYPES: Record<ArchetypeId, ArchetypeDef> = {
  pensioner: {
    id: 'pensioner',
    rentMult: 0.8,
    weight: 20,
    quirk: 'Stěžuje si — táhne dolů náladu sousedů na patře, ale nikdy se neodstěhuje.',
  },
  couple: {
    id: 'couple',
    rentMult: 1.0,
    weight: 30,
    quirk: 'Citliví na rozbitý výtah (vyšší patra).',
  },
  drunk: {
    id: 'drunk',
    rentMult: 0.6,
    weight: 15,
    quirk: 'Občas mejdan — celé patro to odnese.',
  },
  vekslak: {
    id: 'vekslak',
    rentMult: 1.5,
    weight: 10,
    quirk: 'Platí dobře, ale dokud bydlí v domě, hrozí návštěva StB.',
  },
  shift: {
    id: 'shift',
    rentMult: 1.1,
    weight: 25,
    quirk: 'Spolehlivá páteř domu. Žádné vylomeniny.',
  },
};

export const ARCHETYPE_LIST: readonly ArchetypeDef[] = Object.values(ARCHETYPES);

export function pickWeighted<T extends { weight: number }>(items: readonly T[], rng: Rng): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng.next() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

export function createTenant(
  rng: Rng,
  id: number,
  happiness: number,
  forcedArchetype?: ArchetypeId,
): Tenant {
  const archetype = forcedArchetype ?? pickWeighted(ARCHETYPE_LIST, rng).id;
  const pool = CS.archetypes[archetype];
  return {
    id,
    archetype,
    name: rng.pick(pool.names),
    flavor: rng.pick(pool.flavor),
    happiness,
    unhappySince: null,
  };
}
