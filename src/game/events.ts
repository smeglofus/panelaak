// Random events, defined declaratively (spec §6.5): the tick loop only rolls a
// generic weighted pick over eligible definitions — weights and conditions are
// data here, not branches in tick().

import type { GameState, PendingChoice } from './types';
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
  AZOR_FOUND_BONUS,
  AZOR_SEARCH_COST,
  AZOR_SKIP_PENSIONER_HIT,
  BANANAS_HAPPINESS_BONUS,
  MAJ_DECORATION_COST,
  REP_MAJ_DECORATED,
  REP_MAJ_SKIPPED,
  TETA_BONY,
  EVENT_CHANCE,
  EVENT_GRACE_SECONDS,
  fineMult,
  formatKcs,
  JITRNICE_HAPPINESS_BONUS,
  KSC_FINE_MAX,
  KSC_FINE_MIN,
  KSC_FINE_RATE,
  MEJDAN_HAPPINESS_HIT,
  RAJCATA_BONUS,
  REP_AZOR_SKIP,
  REP_BANANAS,
  REP_KSC_FINE,
  REP_KSC_PRAISE,
  REP_TRABANT,
  REP_ZLODEJ,
  SATELLITE_FINE,
  SCHUZE_COST,
  SCHUZE_PAY_BONUS,
  SCHUZE_SKIP_PENALTY,
  STB_FEE_MAX,
  STB_FEE_MIN,
  STB_FEE_RATE,
  VRTANI_HIT,
  ZLODEJ_PENSIONER_HIT,
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
      // A svazák in the house vouches for it — the control always goes well.
      if (hasArchetype(s, 'svazak')) {
        const next = { ...s, reputation: clamp(s.reputation + REP_KSC_PRAISE, 0, 100) };
        return addLog(next, 'good', CS.events.kscSvazak);
      }
      const inBadShape = avgHappiness(s) < 50 || mainBuilding(s).elevatorBroken;
      if (inBadShape) {
        const fine = Math.round(
          clamp(Math.round(s.money * KSC_FINE_RATE), KSC_FINE_MIN, KSC_FINE_MAX) * fineMult(s),
        );
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
    condition: (s) => hasArchetype(s, 'vekslak') || hasArchetype(s, 'disident'),
    apply: (s, rng) => {
      const suspects = mainBuilding(s).flats.filter(
        (f) => f.tenant?.archetype === 'vekslak' || f.tenant?.archetype === 'disident',
      );
      const flat = rng.pick(suspects);
      if (flat.tenant!.archetype === 'disident') {
        if (rng.chance(0.5)) {
          const name = flat.tenant!.name;
          const next = {
            ...vacateFlat(s, flat.index),
            stats: { ...s.stats, moveOuts: s.stats.moveOuts + 1 },
          };
          return addLog(next, 'event', CS.events.stbDisidentGone(name));
        }
        const next = mapTenants(s, (t, f) =>
          f.floor === flat.floor
            ? { ...t, happiness: clamp(t.happiness - MEJDAN_HAPPINESS_HIT, 0, 100) }
            : t,
        );
        return addLog(next, 'bad', CS.events.stbSearch);
      }
      if (rng.chance(0.5)) {
        const name = flat.tenant!.name;
        const next = {
          ...vacateFlat(s, flat.index),
          stats: { ...s.stats, moveOuts: s.stats.moveOuts + 1 },
        };
        return addLog(next, 'event', CS.events.stbGone(name));
      }
      const fee = Math.round(
        clamp(Math.round(s.money * STB_FEE_RATE), STB_FEE_MIN, STB_FEE_MAX) * fineMult(s),
      );
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
      const fine = Math.round(SATELLITE_FINE * fineMult(s));
      const next = {
        ...s,
        money: Math.max(0, s.money - fine),
        upgrades: { ...s.upgrades, satellite: false },
      };
      return addLog(next, 'bad', CS.events.satelliteReported(formatKcs(fine)));
    },
  },
  {
    id: 'vrtani',
    weight: 10,
    condition: (s) => hasArchetype(s, 'kutil'),
    apply: (s, rng) => {
      const kutilFlats = mainBuilding(s).flats.filter((f) => f.tenant?.archetype === 'kutil');
      const floor = rng.pick(kutilFlats).floor;
      const next = mapTenants(s, (t, f) =>
        f.floor === floor && t.archetype !== 'kutil'
          ? { ...t, happiness: clamp(t.happiness - VRTANI_HIT, 0, 100) }
          : t,
      );
      return addLog(next, 'bad', CS.events.vrtani(floor));
    },
  },
  {
    id: 'okno',
    weight: 9,
    condition: (s) =>
      s.courtyard.piskoviste &&
      mainBuilding(s).flats.some((f) => f.tenant && !f.problem),
    apply: (s, rng) => {
      const candidates = mainBuilding(s).flats.filter((f) => f.tenant && !f.problem);
      const target = rng.pick(candidates);
      const next = updateFlat(s, target.index, (f) => ({ ...f, problem: 'window' as const }));
      return addLog(
        { ...next, stats: { ...next.stats, breakdowns: next.stats.breakdowns + 1 } },
        'bad',
        CS.events.okno(CS.ui.flatLabel(target.index + 1)),
      );
    },
  },
  {
    id: 'rajcata',
    weight: 10,
    condition: (s) => s.courtyard.zahonky,
    apply: (s) => {
      const next = mapTenants(s, (t) => ({
        ...t,
        happiness: clamp(t.happiness + RAJCATA_BONUS, 0, 100),
      }));
      return addLog(next, 'good', CS.events.rajcata);
    },
  },
  {
    id: 'zlodej',
    weight: 8,
    condition: (s) => s.courtyard.zahonky,
    apply: (s) => {
      let next = mapTenants(s, (t) =>
        t.archetype === 'pensioner'
          ? { ...t, happiness: clamp(t.happiness - ZLODEJ_PENSIONER_HIT, 0, 100) }
          : t,
      );
      next = { ...next, reputation: clamp(next.reputation + REP_ZLODEJ, 0, 100) };
      return addLog(next, 'bad', CS.events.zlodej);
    },
  },
  {
    id: 'trabant',
    weight: 8,
    condition: (s) => !s.courtyard.garaz && mainBuilding(s).floors >= 2,
    apply: (s) => {
      const next = { ...s, reputation: clamp(s.reputation + REP_TRABANT, 0, 100) };
      return addLog(next, 'bad', CS.events.trabant);
    },
  },
  {
    id: 'azor',
    weight: 8,
    condition: (s) => hasArchetype(s, 'pensioner') && s.pendingChoice === null,
    apply: (s) => ({
      ...s,
      pendingChoice: {
        eventId: 'azor',
        title: CS.events.azorTitle,
        body: CS.events.azorBody,
        options: [
          {
            id: 'search',
            label: CS.events.azorSearch(formatKcs(AZOR_SEARCH_COST)),
            disabled: s.money < AZOR_SEARCH_COST,
          },
          { id: 'skip', label: CS.events.azorSkip },
        ],
      },
    }),
  },
  {
    id: 'teta',
    weight: 6,
    apply: (s) => {
      const next = { ...s, bony: s.bony + TETA_BONY };
      return addLog(next, 'good', CS.events.teta);
    },
  },
  {
    id: 'prosba',
    weight: 12,
    condition: (s) =>
      s.pendingChoice === null && mainBuilding(s).flats.some((f) => f.tenant),
    apply: (s, rng) => {
      const occupied = mainBuilding(s).flats.filter((f) => f.tenant);
      const flat = rng.pick(occupied);
      const requestId = REQUEST_BY_ARCHETYPE[flat.tenant!.archetype] ?? 'zarovka';
      const def = REQUEST_DEFS[requestId];
      const texts = CS.requests[requestId];
      return {
        ...s,
        pendingChoice: {
          eventId: 'prosba',
          flatIndex: flat.index,
          requestId,
          title: CS.events.prosbaTitle,
          body: texts.body(flat.tenant!.name),
          options: [
            { id: 'allow', label: texts.allow, disabled: s.money < def.cost },
            { id: 'refuse', label: texts.refuse },
          ],
        },
      };
    },
  },
];

// --- Tenant requests (prosby) -------------------------------------------------

type RequestId = keyof typeof CS.requests;

interface RequestDef {
  cost: number;
  onAllow: (s: GameState, flatIndex: number) => GameState;
  onRefuse: (s: GameState, flatIndex: number) => GameState;
}

const bumpTenant = (s: GameState, flatIndex: number, delta: number): GameState =>
  mapTenants(s, (t, f) =>
    f.index === flatIndex ? { ...t, happiness: clamp(t.happiness + delta, 0, 100) } : t,
  );

const bumpFloorOthers = (s: GameState, flatIndex: number, delta: number): GameState => {
  const floor = mainBuilding(s).flats.find((f) => f.index === flatIndex)!.floor;
  return mapTenants(s, (t, f) =>
    f.floor === floor && f.index !== flatIndex
      ? { ...t, happiness: clamp(t.happiness + delta, 0, 100) }
      : t,
  );
};

const bumpArchetype = (s: GameState, archetype: string, delta: number): GameState =>
  mapTenants(s, (t) =>
    t.archetype === archetype
      ? { ...t, happiness: clamp(t.happiness + delta, 0, 100) }
      : t,
  );

export const REQUEST_DEFS: Record<RequestId, RequestDef> = {
  pes: {
    cost: 0,
    onAllow: (s, i) => bumpFloorOthers(bumpTenant(s, i, 15), i, -5),
    onRefuse: (s, i) => bumpTenant(s, i, -10),
  },
  odklad: {
    cost: 20,
    onAllow: (s, i) => bumpTenant({ ...s, money: s.money - 20 }, i, 12),
    onRefuse: (s, i) => bumpTenant(s, i, -12),
  },
  zabradli: {
    cost: 25,
    onAllow: (s) => bumpArchetype({ ...s, money: s.money - 25 }, 'pensioner', 10),
    onRefuse: (s) => bumpArchetype(s, 'pensioner', -8),
  },
  nedele: {
    cost: 0,
    onAllow: (s, i) => bumpFloorOthers(bumpTenant(s, i, 15), i, -8),
    onRefuse: (s, i) => bumpTenant(s, i, -10),
  },
  zarovka: {
    cost: 10,
    onAllow: (s) =>
      mapTenants({ ...s, money: s.money - 10 }, (t) => ({
        ...t,
        happiness: clamp(t.happiness + 4, 0, 100),
      })),
    onRefuse: (s, i) => bumpTenant(s, i, -6),
  },
};

const REQUEST_BY_ARCHETYPE: Partial<Record<string, RequestId>> = {
  family: 'pes',
  couple: 'pes',
  drunk: 'odklad',
  pensioner: 'zabradli',
  kutil: 'nedele',
};

/** 1. máj: the entrance decoration is expected. Triggered from the calendar. */
export function majChoice(s: GameState): GameState {
  return {
    ...s,
    pendingChoice: {
      eventId: 'prvnimaj',
      title: CS.events.majTitle,
      body: CS.events.majBody,
      options: [
        {
          id: 'decorate',
          label: CS.events.majDecorate(formatKcs(MAJ_DECORATION_COST)),
          disabled: s.money < MAJ_DECORATION_COST,
        },
        { id: 'skip', label: CS.events.majSkip },
      ],
    },
  };
}

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

// --- Interactive event resolution --------------------------------------------
// Each choice event has a resolver; the store dispatches by pendingChoice id.
// The resolver also receives the original choice for its context fields.

const CHOICE_RESOLVERS: Record<
  string,
  (s: GameState, optionId: string, choice: PendingChoice) => GameState
> = {
  schuze: (s, optionId) => {
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
  },

  azor: (s, optionId) => {
    if (optionId === 'search' && s.money >= AZOR_SEARCH_COST) {
      s = { ...s, money: s.money - AZOR_SEARCH_COST };
      s = mapTenants(s, (t) => ({
        ...t,
        happiness: clamp(t.happiness + AZOR_FOUND_BONUS, 0, 100),
      }));
      return addLog(s, 'good', CS.events.azorFound);
    }
    s = mapTenants(s, (t) =>
      t.archetype === 'pensioner'
        ? { ...t, happiness: clamp(t.happiness - AZOR_SKIP_PENSIONER_HIT, 0, 100) }
        : t,
    );
    s = { ...s, reputation: clamp(s.reputation + REP_AZOR_SKIP, 0, 100) };
    return addLog(s, 'info', CS.events.azorReturned);
  },

  prvnimaj: (s, optionId) => {
    if (optionId === 'decorate' && s.money >= MAJ_DECORATION_COST) {
      s = {
        ...s,
        money: s.money - MAJ_DECORATION_COST,
        reputation: clamp(s.reputation + REP_MAJ_DECORATED, 0, 100),
      };
      return addLog(s, 'good', CS.events.majDecorated);
    }
    s = { ...s, reputation: clamp(s.reputation + REP_MAJ_SKIPPED, 0, 100) };
    return addLog(s, 'bad', CS.events.majSkipped);
  },

  prosba: (s, optionId, choice) => {
    const requestId = choice.requestId as RequestId | undefined;
    const flatIndex = choice.flatIndex;
    if (!requestId || flatIndex === undefined) return s;
    const def = REQUEST_DEFS[requestId];
    const texts = CS.requests[requestId];
    if (optionId === 'allow' && s.money >= def.cost) {
      s = def.onAllow(s, flatIndex);
      return addLog(s, 'good', texts.allowed);
    }
    s = def.onRefuse(s, flatIndex);
    return addLog(s, 'info', texts.refused);
  },
};

/** Resolve the open choice modal; unknown ids just close the modal. */
export function resolveChoice(s: GameState, optionId: string): GameState {
  if (!s.pendingChoice) return s;
  const choice = s.pendingChoice;
  const resolver = CHOICE_RESOLVERS[choice.eventId];
  s = { ...s, pendingChoice: null };
  return resolver ? resolver(s, optionId, choice) : s;
}
