// Tenant archetype definitions and move-in logic (spec §6.3).

import type { ArchetypeId, SecretId, Tenant } from './types';
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
    weight: 16,
    quirk: 'Stěžuje si — táhne dolů náladu sousedů na patře, ale nikdy se neodstěhuje.',
  },
  couple: {
    id: 'couple',
    rentMult: 1.0,
    weight: 22,
    quirk: 'Citliví na rozbitý výtah (vyšší patra).',
  },
  drunk: {
    id: 'drunk',
    rentMult: 0.6,
    weight: 11,
    quirk: 'Občas mejdan — celé patro to odnese.',
  },
  vekslak: {
    id: 'vekslak',
    rentMult: 1.5,
    weight: 6,
    quirk: 'Platí dobře, ale dokud bydlí v domě, hrozí návštěva StB.',
  },
  shift: {
    id: 'shift',
    rentMult: 1.1,
    weight: 18,
    quirk: 'Spolehlivá páteř domu. Žádné vylomeniny.',
  },
  kutil: {
    id: 'kutil',
    rentMult: 1.0,
    weight: 11,
    quirk: 'Občas zadarmo opraví trubku. Občas v sobotu v sedm ráno vrtá.',
  },
  svazak: {
    id: 'svazak',
    rentMult: 0.9,
    weight: 7,
    quirk: 'Kontroly z OV KSČ dopadají vždy dobře. Sousedé jsou nesví.',
  },
  disident: {
    id: 'disident',
    rentMult: 0.7,
    weight: 4,
    quirk: 'Přitahuje StB. Když u vás vydrží půl hodiny, dům drží spolu (+reputace).',
  },
  family: {
    id: 'family',
    rentMult: 1.2,
    weight: 15,
    quirk: 'Bez teplé vody trpí dvojnásob. Pískoviště na dvorku = štěstí.',
  },
  musician: {
    id: 'musician',
    rentMult: 0.8,
    weight: 6,
    quirk: 'Dům má kulturu (+reputace při nastěhování). Sousedé mají večerní koncerty.',
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

/**
 * What each archetype might be hiding, rolled in order at move-in. A disident
 * always hides something (that's the job), most people hide nothing at all.
 */
const SECRET_ODDS: Record<ArchetypeId, readonly { secret: SecretId; chance: number }[]> = {
  disident: [
    { secret: 'samizdat', chance: 0.6 },
    { secret: 'radio', chance: 1 },
  ],
  vekslak: [{ secret: 'veksl', chance: 1 }],
  kutil: [{ secret: 'melouch', chance: 0.4 }],
  musician: [
    { secret: 'zapad', chance: 0.25 },
    { secret: 'radio', chance: 0.2 },
  ],
  svazak: [{ secret: 'radio', chance: 0.15 }],
  pensioner: [{ secret: 'radio', chance: 0.2 }],
  shift: [{ secret: 'melouch', chance: 0.15 }],
  couple: [{ secret: 'zapad', chance: 0.15 }],
  family: [{ secret: 'zapad', chance: 0.1 }],
  drunk: [{ secret: 'palenka', chance: 0.5 }],
};

export function rollSecret(rng: Rng, archetype: ArchetypeId): SecretId | null {
  for (const { secret, chance } of SECRET_ODDS[archetype]) {
    if (rng.chance(chance)) return secret;
  }
  return null;
}

export function createTenant(
  rng: Rng,
  id: number,
  happiness: number,
  tick: number,
  forcedArchetype?: ArchetypeId,
  forcedName?: string,
): Tenant {
  const archetype = forcedArchetype ?? pickWeighted(ARCHETYPE_LIST, rng).id;
  const pool = CS.archetypes[archetype];
  return {
    id,
    archetype,
    name: forcedName ?? rng.pick(pool.names),
    flavor: rng.pick(pool.flavor),
    happiness,
    unhappySince: null,
    movedInAt: tick,
    quirkDone: false,
    evictionAt: null,
    secret: rollSecret(rng, archetype),
    secretKnown: false,
    confided: false,
    covered: false,
    arrestAt: null,
  };
}
