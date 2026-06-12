// Random events, defined declaratively (spec §6.5): the tick loop only rolls a
// generic weighted pick over eligible definitions — weights and conditions are
// data here, not branches in tick().

import type { GameState } from './types';
import type { Rng } from './rng';
import { CS } from './content.cs';
import {
  addLog,
  avgHappiness,
  clamp,
  hasArchetype,
  isEventActive,
  mainBuilding,
  mapTenants,
  updateFlat,
  vacateFlat,
} from './state';
import { pickWeighted } from './tenants';
import {
  BANANAS_HAPPINESS_BONUS,
  EVENT_CHANCE,
  EVENT_GRACE_SECONDS,
  formatKcs,
  JITRNICE_HAPPINESS_BONUS,
  KSC_FINE_MAX,
  KSC_FINE_MIN,
  KSC_FINE_RATE,
  MEJDAN_HAPPINESS_HIT,
  REP_BANANAS,
  REP_KSC_FINE,
  REP_KSC_PRAISE,
  SATELLITE_FINE,
  SCHUZE_COST,
  SCHUZE_PAY_BONUS,
  SCHUZE_SKIP_PENALTY,
  STB_FEE_MAX,
  STB_FEE_MIN,
  STB_FEE_RATE,
} from './economy';

export interface GameEventDef {
  id: string;
  weight: number;
  /** Timed events stay in state.activeEvents for a random duration in this range. */
  duration?: readonly [number, number];
  condition?: (s: GameState) => boolean;
  apply: (s: GameState, rng: Rng) => GameState;
  onExpire?: (s: GameState) => GameState;
}

export const EVENTS: readonly GameEventDef[] = [
  {
    id: 'hotWater',
    weight: 18,
    duration: [60, 180],
    apply: (s) => addLog(s, 'bad', CS.events.hotWater),
    onExpire: (s) => addLog(s, 'info', CS.events.hotWaterEnd),
  },
  {
    id: 'kscControl',
    weight: 14,
    apply: (s) => {
      const inBadShape = avgHappiness(s) < 50 || mainBuilding(s).elevatorBroken;
      if (inBadShape) {
        const fine = clamp(Math.round(s.money * KSC_FINE_RATE), KSC_FINE_MIN, KSC_FINE_MAX);
        const next = {
          ...s,
          money: Math.max(0, s.money - fine),
          reputation: clamp(s.reputation + REP_KSC_FINE, 0, 100),
        };
        return addLog(next, 'bad', CS.events.kscFine(formatKcs(fine)));
      }
      const next = { ...s, reputation: clamp(s.reputation + REP_KSC_PRAISE, 0, 100) };
      return addLog(next, 'good', CS.events.kscPraise);
    },
  },
  {
    id: 'stbVisit',
    weight: 12,
    condition: (s) => hasArchetype(s, 'vekslak'),
    apply: (s, rng) => {
      const flat = mainBuilding(s).flats.find((f) => f.tenant?.archetype === 'vekslak')!;
      if (rng.chance(0.5)) {
        const name = flat.tenant!.name;
        const next = {
          ...vacateFlat(s, flat.index),
          stats: { ...s.stats, moveOuts: s.stats.moveOuts + 1 },
        };
        return addLog(next, 'event', CS.events.stbGone(name));
      }
      const fee = clamp(Math.round(s.money * STB_FEE_RATE), STB_FEE_MIN, STB_FEE_MAX);
      const next = { ...s, money: Math.max(0, s.money - fee) };
      return addLog(next, 'bad', CS.events.stbFee(formatKcs(fee)));
    },
  },
  {
    id: 'mejdan',
    weight: 14,
    condition: (s) => hasArchetype(s, 'drunk'),
    apply: (s, rng) => {
      const drunkFlats = mainBuilding(s).flats.filter((f) => f.tenant?.archetype === 'drunk');
      const floor = rng.pick(drunkFlats).floor;
      const next = mapTenants(s, (t, f) =>
        f.floor === floor
          ? { ...t, happiness: clamp(t.happiness - MEJDAN_HAPPINESS_HIT, 0, 100) }
          : t,
      );
      return addLog(next, 'bad', CS.events.mejdan(floor));
    },
  },
  {
    id: 'bananas',
    weight: 16,
    apply: (s) => {
      let next = mapTenants(s, (t) => ({
        ...t,
        happiness: clamp(t.happiness + BANANAS_HAPPINESS_BONUS, 0, 100),
      }));
      next = { ...next, reputation: clamp(next.reputation + REP_BANANAS, 0, 100) };
      return addLog(next, 'good', CS.events.bananas);
    },
  },
  {
    id: 'schuze',
    weight: 12,
    condition: (s) => s.pendingChoice === null,
    apply: (s) => ({
      ...s,
      pendingChoice: {
        eventId: 'schuze',
        title: CS.events.schuzeTitle,
        body: CS.events.schuzeBody,
        options: [
          {
            id: 'pay',
            label: CS.events.schuzePay(formatKcs(SCHUZE_COST)),
            disabled: s.money < SCHUZE_COST,
          },
          { id: 'skip', label: CS.events.schuzeSkip },
        ],
      },
    }),
  },
  {
    id: 'melouch',
    weight: 10,
    condition: (s) => mainBuilding(s).flats.some((f) => f.problem === 'leak'),
    apply: (s, rng) => {
      const leaky = mainBuilding(s).flats.filter((f) => f.problem === 'leak');
      const target = rng.pick(leaky);
      const next = updateFlat(s, target.index, (f) => ({ ...f, problem: null }));
      return addLog(next, 'good', CS.events.melouch(CS.ui.flatLabel(target.index + 1)));
    },
  },
  {
    id: 'jitrnice',
    weight: 10,
    condition: (s) => hasArchetype(s, 'shift'),
    apply: (s) => {
      const next = mapTenants(s, (t) => ({
        ...t,
        happiness: clamp(t.happiness + JITRNICE_HAPPINESS_BONUS, 0, 100),
      }));
      return addLog(next, 'good', CS.events.jitrnice);
    },
  },
  {
    id: 'satelliteReported',
    weight: 12,
    condition: (s) => s.upgrades.satellite,
    apply: (s) => {
      const next = {
        ...s,
        money: Math.max(0, s.money - SATELLITE_FINE),
        upgrades: { ...s.upgrades, satellite: false },
      };
      return addLog(next, 'bad', CS.events.satelliteReported(formatKcs(SATELLITE_FINE)));
    },
  },
];

export function eligibleEvents(s: GameState): GameEventDef[] {
  return EVENTS.filter(
    (e) => !isEventActive(s, e.id) && (!e.condition || e.condition(s)),
  );
}

/** Age active events, expire finished ones, maybe roll a new one. */
export function processEvents(s: GameState, rng: Rng): GameState {
  const aged = s.activeEvents.map((e) => ({ ...e, remaining: e.remaining - 1 }));
  const expired = aged.filter((e) => e.remaining <= 0);
  s = { ...s, activeEvents: aged.filter((e) => e.remaining > 0) };
  for (const e of expired) {
    const def = EVENTS.find((d) => d.id === e.id);
    if (def?.onExpire) s = def.onExpire(s);
  }

  if (s.tick < EVENT_GRACE_SECONDS) return s;
  if (!rng.chance(EVENT_CHANCE)) return s;

  const eligible = eligibleEvents(s);
  if (eligible.length === 0) return s;

  const def = pickWeighted(eligible, rng);
  s = { ...s, stats: { ...s.stats, eventsFired: s.stats.eventsFired + 1 } };
  if (def.duration) {
    s = {
      ...s,
      activeEvents: [
        ...s.activeEvents,
        { id: def.id, remaining: rng.int(def.duration[0], def.duration[1]) },
      ],
    };
  }
  return def.apply(s, rng);
}

/** Resolve the domovní schůze choice modal (the only interactive event in MVP). */
export function resolveSchuze(s: GameState, optionId: string): GameState {
  if (s.pendingChoice?.eventId !== 'schuze') return s;
  s = { ...s, pendingChoice: null };
  if (optionId === 'pay' && s.money >= SCHUZE_COST) {
    s = { ...s, money: s.money - SCHUZE_COST };
    s = mapTenants(s, (t) => ({
      ...t,
      happiness: clamp(t.happiness + SCHUZE_PAY_BONUS, 0, 100),
    }));
    return addLog(s, 'good', CS.events.schuzePaid);
  }
  s = mapTenants(s, (t) => ({
    ...t,
    happiness: clamp(t.happiness - SCHUZE_SKIP_PENALTY, 0, 100),
  }));
  return addLog(s, 'info', CS.events.schuzeSkipped);
}
