// Šmírování, svěřování, krytí a udávání — the story layer (v0.9). The správce
// stands between the neighbours and the režim; these pure functions are the
// moral gymnastics. All randomness flows through the seed in GameState.

import type { Flat, GameState } from './types';
import { createRng } from './rng';
import { CS } from './content.cs';
import { regimeFell } from './calendar';
import { addLog, allFlats, clamp, mapTenants, updateFlat, vacateFlat } from './state';
import {
  ARREST_DELAY_SECONDS,
  ARREST_HOUSE_HAPPINESS_HIT,
  CONFIDE_MIN_HAPPINESS,
  COVER_TENANT_BONUS,
  REP_ARREST,
  REP_ARREST_CONFIDED_EXTRA,
  REP_COVER,
  REP_SPY_CAUGHT,
  REPORT_BONY,
  REPORT_REGIME_BONUS,
  SPY_CAUGHT_CHANCE,
  SPY_CAUGHT_HAPPINESS_HIT,
  SPY_DISCOVER_CHANCE,
  SPY_ENERGY_COST,
} from './economy';

function findFlat(s: GameState, flatIndex: number): Flat | undefined {
  return allFlats(s).find((f) => f.index === flatIndex);
}

/** Flats whose tenant hides something the správce could still learn. */
export function confideCandidates(s: GameState): Flat[] {
  return allFlats(s).filter(
    (f) =>
      f.tenant &&
      f.tenant.secret !== null &&
      !f.tenant.secretKnown &&
      f.tenant.happiness >= CONFIDE_MIN_HAPPINESS,
  );
}

/** Flats with a known secret and no hlášení filed yet — ammunition for the StB. */
export function knownUnreported(s: GameState): Flat[] {
  return allFlats(s).filter(
    (f) => f.tenant?.secretKnown && f.tenant.arrestAt === null,
  );
}

/**
 * An ear on the door: costs elán, may find the secret, may backfire when the
 * tenant catches the správce mid-šmír. No-op when there is nothing to learn.
 */
export function spyOnTenant(s: GameState, flatIndex: number): GameState {
  const flat = findFlat(s, flatIndex);
  const t = flat?.tenant;
  if (!t || t.secretKnown || s.energy < SPY_ENERGY_COST) return s;

  const rng = createRng(s.rngSeed);
  s = {
    ...s,
    energy: s.energy - SPY_ENERGY_COST,
    stats: { ...s.stats, spied: s.stats.spied + 1 },
  };

  if (rng.chance(SPY_CAUGHT_CHANCE)) {
    s = mapTenants(s, (tt, f) =>
      f.bldg === flat!.bldg && f.floor === flat!.floor
        ? { ...tt, happiness: clamp(tt.happiness - SPY_CAUGHT_HAPPINESS_HIT, 0, 100) }
        : tt,
    );
    s = { ...s, reputation: clamp(s.reputation + REP_SPY_CAUGHT, 0, 100) };
    s = addLog(s, 'bad', CS.spy.caught(t.name));
  } else if (t.secret !== null && rng.chance(SPY_DISCOVER_CHANCE)) {
    s = updateFlat(s, flatIndex, (f) => ({
      ...f,
      tenant: { ...f.tenant!, secretKnown: true },
    }));
    s = addLog(s, 'event', CS.secrets[t.secret].discovered(t.name));
  } else {
    s = addLog(s, 'info', rng.pick(CS.spy.nothing)(t.name));
  }

  return { ...s, rngSeed: rng.state() };
}

/** Take the tenant under the wing: they know you know, and you say nothing. */
export function coverTenant(s: GameState, flatIndex: number): GameState {
  const t = findFlat(s, flatIndex)?.tenant;
  if (!t || !t.secretKnown || t.covered || t.arrestAt !== null) return s;
  s = updateFlat(s, flatIndex, (f) => ({
    ...f,
    tenant: {
      ...f.tenant!,
      covered: true,
      happiness: clamp(f.tenant!.happiness + COVER_TENANT_BONUS, 0, 100),
    },
  }));
  s = {
    ...s,
    reputation: clamp(s.reputation + REP_COVER, 0, 100),
    stats: { ...s.stats, covered: s.stats.covered + 1 },
  };
  return addLog(s, 'good', CS.spy.covered(t.name));
}

/** File the hlášení. The profile improves, an envelope arrives, a clock starts. */
export function reportTenant(s: GameState, flatIndex: number): GameState {
  if (regimeFell(s.tick)) return s;
  const t = findFlat(s, flatIndex)?.tenant;
  if (!t || !t.secretKnown || t.arrestAt !== null) return s;
  s = updateFlat(s, flatIndex, (f) => ({
    ...f,
    tenant: { ...f.tenant!, covered: false, arrestAt: s.tick + ARREST_DELAY_SECONDS },
  }));
  s = {
    ...s,
    regime: clamp(s.regime + REPORT_REGIME_BONUS, 0, 100),
    bony: s.bony + REPORT_BONY,
    stats: { ...s.stats, reported: s.stats.reported + 1 },
  };
  return addLog(s, 'info', CS.spy.reported(t.name));
}

/** The 6:00 knock. The house notices, and remembers who filed what. */
export function processArrests(s: GameState): GameState {
  for (const flat of allFlats(s)) {
    const t = flat.tenant;
    if (t?.arrestAt == null || s.tick < t.arrestAt) continue;
    s = vacateFlat(s, flat.index);
    s = mapTenants(s, (tt) => ({
      ...tt,
      happiness: clamp(tt.happiness - ARREST_HOUSE_HAPPINESS_HIT, 0, 100),
    }));
    const repHit = REP_ARREST + (t.confided ? REP_ARREST_CONFIDED_EXTRA : 0);
    s = {
      ...s,
      reputation: clamp(s.reputation + repHit, 0, 100),
      stats: { ...s.stats, moveOuts: s.stats.moveOuts + 1 },
    };
    s = addLog(s, 'event', t.confided ? CS.spy.arrestConfided(t.name) : CS.spy.arrest(t.name));
  }
  return s;
}
