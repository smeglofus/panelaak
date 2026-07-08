// Privatizace 1991 — the prestige loop. Once the calendar reaches 1990 the
// house can be privatized: the game resets, kupóny are earned from lifetime
// income and spent on permanent perks that survive every era.

import type { GameState, Meta, PerkId } from './types';
import { dateFromTick } from './calendar';
import { PERK_COSTS, PERK_MAX, PRIVATIZACE_YEAR } from './economy';
import { addLog, createInitialState } from './state';
import { CS } from './content.cs';

export function privatizaceAvailable(s: GameState): boolean {
  return dateFromTick(s.tick).year >= PRIVATIZACE_YEAR;
}

/** A year before the unlock, the rumours start. */
export function privatizaceRumoured(s: GameState): boolean {
  return dateFromTick(s.tick).year >= PRIVATIZACE_YEAR - 1;
}

/**
 * Kupóny earned by privatizing now: lifetime earnings buy the bulk, the
 * Vzorný dům title adds a bonus. Tuned so the first prestige yields ~15–25.
 */
export function computeKupony(s: GameState): number {
  const fromEarnings = Math.floor(Math.sqrt(s.totalEarned / 500));
  const fromTitle = s.milestones.vzornyDum ? 5 : 0;
  return fromEarnings + fromTitle;
}

/** Reset the world, keep (and grow) the meta. */
export function applyPrestige(s: GameState, seed?: number): GameState {
  const earned = computeKupony(s);
  const meta: Meta = {
    prestigeLevel: s.meta.prestigeLevel + 1,
    kupony: s.meta.kupony + earned,
    perks: s.meta.perks,
    badges: s.meta.badges, // kádrový posudek survives every era
  };
  let next = createInitialState(seed, meta);
  next = addLog(next, 'milestone', CS.prestige.done(earned));
  return next;
}

export function buyPerk(s: GameState, id: PerkId): GameState {
  const level = s.meta.perks[id];
  const cost = PERK_COSTS[id];
  if (level >= PERK_MAX[id] || s.meta.kupony < cost) return s;
  const meta: Meta = {
    ...s.meta,
    kupony: s.meta.kupony - cost,
    perks: { ...s.meta.perks, [id]: level + 1 },
  };
  return addLog({ ...s, meta }, 'good', CS.prestige.perkBought(CS.perks[id].name, level + 1));
}
