// Random events, defined declaratively (spec §6.5): the tick loop only rolls a
// generic weighted pick over eligible definitions — weights and conditions are
// data here, not branches in tick().

import type { GameState, PendingChoice } from './types';
import type { Rng } from './rng';
import { CS } from './content.cs';
import { dateFromTick, regimeFell, seasonKey, type Season } from './calendar';
import {
  addLog,
  avgHappiness,
  clamp,
  hasArchetype,
  allFlats,
  isEventActive,
  mapTenants,
  updateFlat,
  vacateFlat,
} from './state';
import { pickWeighted } from './tenants';
import { confideCandidates, knownUnreported, reportTenant } from './secrets';
import {
  AZOR_FOUND_BONUS,
  AZOR_SEARCH_COST,
  AZOR_SKIP_PENSIONER_HIT,
  BANANAS_HAPPINESS_BONUS,
  BLATO_HIT,
  BRAMBORY_HAPPINESS_HIT,
  BRAMBORY_REGIME,
  BRAMBORY_SKIP_REGIME,
  CONFIDE_MIN_REP,
  CONFIDE_REFUSED_HIT,
  CONFIDE_TENANT_BONUS,
  COVER_HELD_TENANT_BONUS,
  HLASENI_MIN_TICK,
  KALAMITA_ENERGY_COST,
  KALAMITA_SHOVELED_BONUS,
  KALAMITA_SKIP_HIT,
  MAJ_DECORATION_COST,
  MANDARINKY_BONUS,
  REGIME_COVER_BUSTED,
  REGIME_HLASENI_DENIED,
  REGIME_MAJ_DECORATED,
  REGIME_MAJ_SKIPPED,
  REP_CONFIDE_ACCEPTED,
  REP_COVER_HELD,
  REP_KALAMITA_SHOVELED,
  REP_KALAMITA_SKIP,
  REP_MANDARINKY,
  POMLAZKA_BONUS,
  POSVICENI_BONUS,
  POSVICENI_COST,
  STB_COVER_BUST_CHANCE,
  TETA_BONY,
  EVENT_CHANCE,
  EVENT_GRACE_SECONDS,
  EVENT_SIDLISTE_BONUS,
  fineMult,
  formatKcs,
  INVENTURA_HIT,
  POUT_COST,
  POUT_HAPPINESS_BONUS,
  STEHOVANI_HIT,
  VOLBY_HAPPINESS_HIT,
  VOLBY_REGIME_GO,
  VOLBY_REGIME_SKIP,
  JITRNICE_HAPPINESS_BONUS,
  KSC_FINE_MAX,
  KSC_FINE_MIN,
  KSC_FINE_RATE,
  MEJDAN_HAPPINESS_HIT,
  RAJCATA_BONUS,
  REP_AZOR_SKIP,
  REP_BANANAS,
  REGIME_KSC_FINE,
  REGIME_KSC_PRAISE,
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

const inSeason = (s: GameState, season: Season): boolean =>
  seasonKey(dateFromTick(s.tick)) === season;

/** Regime-flavored events stop firing once the regime stops existing. */
const preRevolution = (s: GameState): boolean => !regimeFell(s.tick);

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
    condition: preRevolution,
    apply: (s) => {
      // A svazák in the house vouches for it — the control always goes well.
      if (hasArchetype(s, 'svazak')) {
        const next = { ...s, regime: clamp(s.regime + REGIME_KSC_PRAISE, 0, 100) };
        return addLog(next, 'good', CS.events.kscSvazak);
      }
      const inBadShape = avgHappiness(s) < 50 || s.buildings.some((b) => b.elevatorBroken);
      if (inBadShape) {
        const fine = Math.round(
          clamp(Math.round(s.money * KSC_FINE_RATE), KSC_FINE_MIN, KSC_FINE_MAX) * fineMult(s),
        );
        const next = {
          ...s,
          money: Math.max(0, s.money - fine),
          regime: clamp(s.regime + REGIME_KSC_FINE, 0, 100),
        };
        return addLog(next, 'bad', CS.events.kscFine(formatKcs(fine)));
      }
      const next = { ...s, regime: clamp(s.regime + REGIME_KSC_PRAISE, 0, 100) };
      return addLog(next, 'good', CS.events.kscPraise);
    },
  },
  {
    id: 'stbVisit',
    weight: 12,
    // Suspects: the usual archetypes, plus anyone the správce is covering for.
    condition: (s) =>
      preRevolution(s) &&
      allFlats(s).some(
        (f) =>
          f.tenant &&
          f.tenant.arrestAt === null &&
          (f.tenant.archetype === 'vekslak' ||
            f.tenant.archetype === 'disident' ||
            f.tenant.covered),
      ),
    apply: (s, rng) => {
      const suspects = allFlats(s).filter(
        (f) =>
          f.tenant &&
          f.tenant.arrestAt === null &&
          (f.tenant.archetype === 'vekslak' ||
            f.tenant.archetype === 'disident' ||
            f.tenant.covered),
      );
      const flat = rng.pick(suspects);
      s = { ...s, stats: { ...s.stats, stbVisits: s.stats.stbVisits + 1 } };
      if (flat.tenant!.covered) {
        // The správce stands in the doorway with the papers of an honest house.
        if (rng.chance(STB_COVER_BUST_CHANCE)) {
          const fee = Math.round(
            clamp(Math.round(s.money * STB_FEE_RATE), STB_FEE_MIN, STB_FEE_MAX) * fineMult(s),
          );
          const next = {
            ...s,
            money: Math.max(0, s.money - fee),
            regime: clamp(s.regime + REGIME_COVER_BUSTED, 0, 100),
          };
          return addLog(next, 'bad', CS.spy.coverBusted(flat.tenant!.name, formatKcs(fee)));
        }
        let next = updateFlat(s, flat.index, (f) => ({
          ...f,
          tenant: {
            ...f.tenant!,
            happiness: clamp(f.tenant!.happiness + COVER_HELD_TENANT_BONUS, 0, 100),
          },
        }));
        next = { ...next, reputation: clamp(next.reputation + REP_COVER_HELD, 0, 100) };
        return addLog(next, 'good', CS.spy.coverHeld(flat.tenant!.name));
      }
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
          f.bldg === flat.bldg && f.floor === flat.floor
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
      const drunkFlats = allFlats(s).filter((f) => f.tenant?.archetype === 'drunk');
      const spot = rng.pick(drunkFlats);
      const next = mapTenants(s, (t, f) =>
        f.bldg === spot.bldg && f.floor === spot.floor
          ? { ...t, happiness: clamp(t.happiness - MEJDAN_HAPPINESS_HIT, 0, 100) }
          : t,
      );
      return addLog(next, 'bad', CS.events.mejdan(spot.floor));
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
    condition: (s) => allFlats(s).some((f) => f.problem === 'leak'),
    apply: (s, rng) => {
      const leaky = allFlats(s).filter((f) => f.problem === 'leak');
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
    // Po revoluci už satelit nikoho nezajímá.
    condition: (s) => s.upgrades.satellite && preRevolution(s),
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
      const kutilFlats = allFlats(s).filter((f) => f.tenant?.archetype === 'kutil');
      const spot = rng.pick(kutilFlats);
      const next = mapTenants(s, (t, f) =>
        f.bldg === spot.bldg && f.floor === spot.floor && t.archetype !== 'kutil'
          ? { ...t, happiness: clamp(t.happiness - VRTANI_HIT, 0, 100) }
          : t,
      );
      return addLog(next, 'bad', CS.events.vrtani(spot.floor));
    },
  },
  {
    id: 'okno',
    weight: 9,
    condition: (s) =>
      s.courtyard.piskoviste &&
      allFlats(s).some((f) => f.tenant && !f.problem),
    apply: (s, rng) => {
      const candidates = allFlats(s).filter((f) => f.tenant && !f.problem);
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
    condition: (s) => !s.courtyard.garaz && s.buildings.some((b) => b.floors >= 2),
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
    id: 'pout',
    weight: 8,
    apply: (s) => {
      let next = mapTenants(s, (t) => ({
        ...t,
        happiness: clamp(t.happiness + POUT_HAPPINESS_BONUS, 0, 100),
      }));
      next = { ...next, money: Math.max(0, next.money - POUT_COST) };
      return addLog(next, 'good', CS.events.pout);
    },
  },
  {
    id: 'inventura',
    weight: 8,
    apply: (s) => {
      const next = mapTenants(s, (t) => ({
        ...t,
        happiness: clamp(t.happiness - INVENTURA_HIT, 0, 100),
      }));
      return addLog(next, 'bad', CS.events.inventura);
    },
  },
  {
    id: 'stehovani',
    weight: 8,
    condition: (s) =>
      allFlats(s).some(
        (f) => f.tenant?.archetype === 'couple' || f.tenant?.archetype === 'family',
      ),
    apply: (s, rng) => {
      const movers = allFlats(s).filter(
        (f) => f.tenant?.archetype === 'couple' || f.tenant?.archetype === 'family',
      );
      const spot = rng.pick(movers);
      const next = mapTenants(s, (t, f) =>
        f.bldg === spot.bldg && f.floor === spot.floor
          ? { ...t, happiness: clamp(t.happiness - STEHOVANI_HIT, 0, 100) }
          : t,
      );
      return addLog(next, 'info', CS.events.stehovani(spot.floor));
    },
  },
  {
    id: 'volby',
    weight: 8,
    condition: (s) => s.pendingChoice === null && preRevolution(s),
    apply: (s) => ({
      ...s,
      pendingChoice: {
        eventId: 'volby',
        title: CS.events.volbyTitle,
        body: CS.events.volbyBody,
        options: [
          { id: 'go', label: CS.events.volbyGo },
          { id: 'skip', label: CS.events.volbySkip },
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
      s.pendingChoice === null && allFlats(s).some((f) => f.tenant),
    apply: (s, rng) => {
      const occupied = allFlats(s).filter((f) => f.tenant);
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

  // --- Seasonal events (v0.9) ---------------------------------------------------
  {
    id: 'studenaVoda',
    weight: 9,
    duration: [45, 120],
    apply: (s) => addLog(s, 'bad', CS.events.studenaVoda),
    onExpire: (s) => addLog(s, 'info', CS.events.studenaVodaEnd),
  },
  {
    id: 'vedro',
    weight: 14,
    duration: [60, 150],
    condition: (s) => inSeason(s, 'summer'),
    apply: (s) => addLog(s, 'bad', CS.events.vedro),
    onExpire: (s) => addLog(s, 'info', CS.events.vedroEnd),
  },
  {
    id: 'chripka',
    weight: 12,
    duration: [60, 150],
    condition: (s) => inSeason(s, 'winter'),
    apply: (s) => addLog(s, 'bad', CS.events.chripka),
    onExpire: (s) => addLog(s, 'info', CS.events.chripkaEnd),
  },
  {
    id: 'kalamita',
    weight: 12,
    condition: (s) => inSeason(s, 'winter') && s.pendingChoice === null,
    apply: (s) => ({
      ...s,
      pendingChoice: {
        eventId: 'kalamita',
        title: CS.events.kalamitaTitle,
        body: CS.events.kalamitaBody,
        options: [
          {
            id: 'shovel',
            label: CS.events.kalamitaShovel,
            disabled: s.energy < KALAMITA_ENERGY_COST,
          },
          { id: 'skip', label: CS.events.kalamitaSkip },
        ],
      },
    }),
  },
  {
    id: 'mandarinky',
    weight: 20,
    condition: (s) => dateFromTick(s.tick).month === 12,
    apply: (s) => {
      let next = mapTenants(s, (t) => ({
        ...t,
        happiness: clamp(t.happiness + MANDARINKY_BONUS, 0, 100),
      }));
      next = { ...next, reputation: clamp(next.reputation + REP_MANDARINKY, 0, 100) };
      return addLog(next, 'good', CS.events.mandarinky);
    },
  },
  {
    id: 'pomlazka',
    weight: 10,
    condition: (s) => inSeason(s, 'spring'),
    apply: (s) => {
      const next = mapTenants(s, (t) => ({
        ...t,
        happiness: clamp(t.happiness + POMLAZKA_BONUS, 0, 100),
      }));
      return addLog(next, 'good', CS.events.pomlazka);
    },
  },
  {
    id: 'blato',
    weight: 8,
    condition: (s) => inSeason(s, 'spring'),
    apply: (s) => {
      const next = mapTenants(s, (t) => ({
        ...t,
        happiness: clamp(t.happiness - BLATO_HIT, 0, 100),
      }));
      return addLog(next, 'bad', CS.events.blato);
    },
  },
  {
    id: 'brambory',
    weight: 10,
    condition: (s) =>
      inSeason(s, 'autumn') && preRevolution(s) && s.pendingChoice === null,
    apply: (s) => ({
      ...s,
      pendingChoice: {
        eventId: 'brambory',
        title: CS.events.bramboryTitle,
        body: CS.events.bramboryBody,
        options: [
          { id: 'send', label: CS.events.bramborySend },
          { id: 'skip', label: CS.events.bramborySkip },
        ],
      },
    }),
  },
  {
    id: 'pliskanice',
    weight: 8,
    condition: (s) =>
      inSeason(s, 'autumn') && allFlats(s).some((f) => f.tenant && !f.problem),
    apply: (s, rng) => {
      const candidates = allFlats(s).filter((f) => f.tenant && !f.problem);
      const target = rng.pick(candidates);
      const next = updateFlat(s, target.index, (f) => ({ ...f, problem: 'leak' as const }));
      return addLog(
        { ...next, stats: { ...next.stats, breakdowns: next.stats.breakdowns + 1 } },
        'bad',
        CS.events.pliskanice(CS.ui.flatLabel(target.index + 1)),
      );
    },
  },
  {
    id: 'posviceni',
    weight: 8,
    condition: (s) => inSeason(s, 'autumn'),
    apply: (s) => {
      let next = mapTenants(s, (t) => ({
        ...t,
        happiness: clamp(t.happiness + POSVICENI_BONUS, 0, 100),
      }));
      next = { ...next, money: Math.max(0, next.money - POSVICENI_COST) };
      return addLog(next, 'good', CS.events.posviceni);
    },
  },

  // --- Svěřování a hlášení (v0.9) -----------------------------------------------
  {
    id: 'svereni',
    weight: 10,
    condition: (s) =>
      s.pendingChoice === null &&
      preRevolution(s) &&
      s.reputation >= CONFIDE_MIN_REP &&
      confideCandidates(s).length > 0,
    apply: (s, rng) => {
      const flat = rng.pick(confideCandidates(s));
      const t = flat.tenant!;
      return {
        ...s,
        pendingChoice: {
          eventId: 'svereni',
          flatIndex: flat.index,
          title: CS.events.svereniTitle,
          body: CS.secrets[t.secret!].confide(t.name),
          options: [
            { id: 'accept', label: CS.events.svereniAccept },
            { id: 'refuse', label: CS.events.svereniRefuse },
          ],
        },
      };
    },
  },
  {
    id: 'stbHlaseni',
    weight: 8,
    condition: (s) =>
      s.pendingChoice === null &&
      preRevolution(s) &&
      s.tick >= HLASENI_MIN_TICK &&
      knownUnreported(s).length > 0,
    apply: (s, rng) => {
      const flat = rng.pick(knownUnreported(s));
      return {
        ...s,
        pendingChoice: {
          eventId: 'stbHlaseni',
          flatIndex: flat.index,
          title: CS.events.hlaseniTitle,
          body: CS.events.hlaseniBody,
          options: [
            { id: 'report', label: CS.events.hlaseniReport(flat.tenant!.name) },
            { id: 'deny', label: CS.events.hlaseniDeny },
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
  const spot = allFlats(s).find((f) => f.index === flatIndex)!;
  return mapTenants(s, (t, f) =>
    f.bldg === spot.bldg && f.floor === spot.floor && f.index !== flatIndex
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
  zkouska: {
    cost: 0,
    onAllow: (s, i) => bumpFloorOthers(bumpTenant(s, i, 15), i, -5),
    onRefuse: (s, i) => bumpTenant(s, i, -10),
  },
  kralikarna: {
    cost: 30,
    onAllow: (s) => bumpArchetype({ ...s, money: s.money - 30 }, 'shift', 12),
    onRefuse: (s) => bumpArchetype(s, 'shift', -8),
  },
};

const REQUEST_BY_ARCHETYPE: Partial<Record<string, RequestId>> = {
  family: 'pes',
  couple: 'pes',
  drunk: 'odklad',
  pensioner: 'zabradli',
  kutil: 'nedele',
  musician: 'zkouska',
  shift: 'kralikarna',
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
  // A bigger sídliště generates more life.
  const chance = EVENT_CHANCE * (1 + EVENT_SIDLISTE_BONUS * (s.buildings.length - 1));
  if (!rng.chance(chance)) return s;

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

  volby: (s, optionId) => {
    if (optionId === 'go') {
      s = { ...s, regime: clamp(s.regime + VOLBY_REGIME_GO, 0, 100) };
      s = mapTenants(s, (t) => ({
        ...t,
        happiness: clamp(t.happiness - VOLBY_HAPPINESS_HIT, 0, 100),
      }));
      return addLog(s, 'good', CS.events.volbyWent);
    }
    s = { ...s, regime: clamp(s.regime + VOLBY_REGIME_SKIP, 0, 100) };
    return addLog(s, 'bad', CS.events.volbySkipped);
  },

  prvnimaj: (s, optionId) => {
    if (optionId === 'decorate' && s.money >= MAJ_DECORATION_COST) {
      s = {
        ...s,
        money: s.money - MAJ_DECORATION_COST,
        regime: clamp(s.regime + REGIME_MAJ_DECORATED, 0, 100),
      };
      return addLog(s, 'good', CS.events.majDecorated);
    }
    s = { ...s, regime: clamp(s.regime + REGIME_MAJ_SKIPPED, 0, 100) };
    return addLog(s, 'bad', CS.events.majSkipped);
  },

  kalamita: (s, optionId) => {
    if (optionId === 'shovel' && s.energy >= KALAMITA_ENERGY_COST) {
      s = {
        ...s,
        energy: s.energy - KALAMITA_ENERGY_COST,
        reputation: clamp(s.reputation + REP_KALAMITA_SHOVELED, 0, 100),
      };
      s = mapTenants(s, (t) => ({
        ...t,
        happiness: clamp(t.happiness + KALAMITA_SHOVELED_BONUS, 0, 100),
      }));
      return addLog(s, 'good', CS.events.kalamitaShoveled);
    }
    s = mapTenants(s, (t) => ({
      ...t,
      happiness: clamp(t.happiness - KALAMITA_SKIP_HIT, 0, 100),
    }));
    s = { ...s, reputation: clamp(s.reputation + REP_KALAMITA_SKIP, 0, 100) };
    return addLog(s, 'bad', CS.events.kalamitaSkipped);
  },

  brambory: (s, optionId) => {
    if (optionId === 'send') {
      s = { ...s, regime: clamp(s.regime + BRAMBORY_REGIME, 0, 100) };
      s = mapTenants(s, (t) => ({
        ...t,
        happiness: clamp(t.happiness - BRAMBORY_HAPPINESS_HIT, 0, 100),
      }));
      return addLog(s, 'info', CS.events.bramborySent);
    }
    s = { ...s, regime: clamp(s.regime + BRAMBORY_SKIP_REGIME, 0, 100) };
    return addLog(s, 'bad', CS.events.bramborySkipped);
  },

  svereni: (s, optionId, choice) => {
    const flatIndex = choice.flatIndex;
    if (flatIndex === undefined) return s;
    const flat = allFlats(s).find((f) => f.index === flatIndex);
    const t = flat?.tenant;
    if (!t) return s;
    if (optionId === 'accept') {
      s = updateFlat(s, flatIndex, (f) => ({
        ...f,
        tenant: {
          ...f.tenant!,
          secretKnown: true,
          confided: true,
          happiness: clamp(f.tenant!.happiness + CONFIDE_TENANT_BONUS, 0, 100),
        },
      }));
      s = {
        ...s,
        reputation: clamp(s.reputation + REP_CONFIDE_ACCEPTED, 0, 100),
        stats: { ...s.stats, confided: s.stats.confided + 1 },
      };
      return addLog(s, 'event', CS.spy.confided(t.name));
    }
    s = updateFlat(s, flatIndex, (f) => ({
      ...f,
      tenant: {
        ...f.tenant!,
        happiness: clamp(f.tenant!.happiness - CONFIDE_REFUSED_HIT, 0, 100),
      },
    }));
    return addLog(s, 'info', CS.events.svereniRefused);
  },

  stbHlaseni: (s, optionId, choice) => {
    if (optionId === 'report' && choice.flatIndex !== undefined) {
      return reportTenant(s, choice.flatIndex);
    }
    s = { ...s, regime: clamp(s.regime + REGIME_HLASENI_DENIED, 0, 100) };
    return addLog(s, 'info', CS.events.hlaseniDenied);
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
