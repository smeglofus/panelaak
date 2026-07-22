// v0.9: šmírování, svěřování, krytí, udávání — plus the regime axis,
// seasonal events, comfort compression and the sametová revoluce.

import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { tick, happinessTarget } from '../tick';
import { eligibleEvents, EVENTS, resolveChoice } from '../events';
import { processPlan } from '../plans';
import { computeKupony } from '../prestige';
import { coverTenant, processArrests, reportTenant, spyOnTenant } from '../secrets';
import { migrateSave } from '../state';
import type { GameState } from '../types';
import {
  ARREST_DELAY_SECONDS,
  brigadeRegen,
  comfortExcessLoss,
  fineMult,
  KALAMITA_ENERGY_COST,
  REGIME_HLASENI_DENIED,
  regimeMoveInMult,
  REPORT_BONY,
  SPY_CAUGHT_CHANCE,
  SPY_ENERGY_COST,
  STARTING_REGIME,
} from '../economy';
import { freshState, withTenant } from './helpers';

const def = (id: string) => EVENTS.find((e) => e.id === id)!;

// Calendar anchors (start 1. 4. 1988, 30 s/day, 360-day year).
const TICK_JAN_1989 = 270 * 30; // 1. 1. 1989 — winter
const TICK_JUL_1988 = 91 * 30; // 2. 7. 1988 — summer
const TICK_REVOLUTION_EVE = 586 * 30 - 1; // one tick before 17. 11. 1989

// Spy outcomes branch on two rng draws: caught first, then discovery.
let seedDiscover = -1;
let seedCaught = -1;
for (let i = 1; i < 200 && (seedDiscover < 0 || seedCaught < 0); i++) {
  const r = createRng(i);
  const caught = r.next() < SPY_CAUGHT_CHANCE;
  if (caught) {
    if (seedCaught < 0) seedCaught = i;
  } else if (r.next() < 0.55 && seedDiscover < 0) {
    seedDiscover = i;
  }
}

function withSecretTenant(happiness = 70): GameState {
  return withTenant(freshState(), 1, {
    archetype: 'disident',
    secret: 'samizdat',
    happiness,
  });
}

describe('šmírování', () => {
  it('costs elán and can discover the secret', () => {
    const s = { ...withSecretTenant(), rngSeed: seedDiscover };
    const next = spyOnTenant(s, 1);
    expect(next.energy).toBe(s.energy - SPY_ENERGY_COST);
    expect(next.stats.spied).toBe(1);
    expect(next.buildings[0].flats[1].tenant!.secretKnown).toBe(true);
  });

  it('can backfire when the tenant catches the správce', () => {
    const s = { ...withSecretTenant(), rngSeed: seedCaught };
    const next = spyOnTenant(s, 1);
    expect(next.buildings[0].flats[1].tenant!.secretKnown).toBe(false);
    expect(next.reputation).toBeLessThan(s.reputation);
    expect(next.buildings[0].flats[1].tenant!.happiness).toBeLessThan(70);
  });

  it('is a no-op without enough elán', () => {
    const s = { ...withSecretTenant(), energy: SPY_ENERGY_COST - 1 };
    expect(spyOnTenant(s, 1)).toBe(s);
  });
});

describe('krytí a udávání', () => {
  function known(): GameState {
    let s = withSecretTenant();
    const b = s.buildings[0];
    s = {
      ...s,
      buildings: [
        {
          ...b,
          flats: b.flats.map((f) =>
            f.index === 1 ? { ...f, tenant: { ...f.tenant!, secretKnown: true } } : f,
          ),
        },
      ],
    };
    return s;
  }

  it('cover lifts the tenant and the neighbours’ trust', () => {
    const s = known();
    const next = coverTenant(s, 1);
    expect(next.buildings[0].flats[1].tenant!.covered).toBe(true);
    expect(next.reputation).toBeGreaterThan(s.reputation);
    expect(next.stats.covered).toBe(1);
  });

  it('report pays the profile and bony, then the arrest empties the flat', () => {
    const s = known();
    let next = reportTenant(s, 1);
    expect(next.regime).toBeGreaterThan(s.regime);
    expect(next.bony).toBe(s.bony + REPORT_BONY);
    expect(next.buildings[0].flats[1].tenant!.arrestAt).toBe(s.tick + ARREST_DELAY_SECONDS);

    next = { ...next, tick: next.tick + ARREST_DELAY_SECONDS };
    next = processArrests(next);
    expect(next.buildings[0].flats[1].tenant).toBeNull();
    expect(next.reputation).toBeLessThan(s.reputation);
  });

  it('reporting is impossible once the regime fell', () => {
    const s = { ...known(), tick: TICK_REVOLUTION_EVE + 100 };
    expect(reportTenant(s, 1)).toBe(s);
  });
});

describe('svěřování a hlášení', () => {
  it('svereni fires only with trust and a happy secret-holder, and confides on accept', () => {
    const low = { ...withSecretTenant(40), reputation: 80 };
    expect(eligibleEvents(low).map((e) => e.id)).not.toContain('svereni');

    const ready = { ...withSecretTenant(90), reputation: 80 };
    expect(eligibleEvents(ready).map((e) => e.id)).toContain('svereni');

    const opened = def('svereni').apply(ready, createRng(1));
    expect(opened.pendingChoice?.eventId).toBe('svereni');
    const accepted = resolveChoice(opened, 'accept');
    const t = accepted.buildings[0].flats[1].tenant!;
    expect(t.secretKnown).toBe(true);
    expect(t.confided).toBe(true);
    expect(accepted.stats.confided).toBe(1);
  });

  it('stbHlaseni needs a known unreported secret; denying costs the profile', () => {
    const s = { ...withSecretTenant(90), tick: 700 };
    expect(eligibleEvents(s).map((e) => e.id)).not.toContain('stbHlaseni');

    const b = s.buildings[0];
    const knowing = {
      ...s,
      buildings: [
        {
          ...b,
          flats: b.flats.map((f) =>
            f.index === 1 ? { ...f, tenant: { ...f.tenant!, secretKnown: true } } : f,
          ),
        },
      ],
    };
    expect(eligibleEvents(knowing).map((e) => e.id)).toContain('stbHlaseni');

    const opened = def('stbHlaseni').apply(knowing, createRng(1));
    const denied = resolveChoice(opened, 'deny');
    expect(denied.regime).toBe(knowing.regime + REGIME_HLASENI_DENIED);
  });
});

describe('sametová revoluce', () => {
  it('fires on 17. 11. 1989 and judges the era’s správce', () => {
    let s = withTenant(freshState(), 1);
    s = {
      ...s,
      tick: TICK_REVOLUTION_EVE,
      stats: { ...s.stats, reported: 3 },
      nextPlanAt: 999999,
    };
    const next = tick(s);
    expect(next.log.some((e) => e.kind === 'milestone' && e.text.includes('1989'))).toBe(true);
    expect(next.reputation).toBeLessThan(35);
  });

  it('shuts down regime events, plans and the regime part of fines', () => {
    let s = withTenant(freshState(), 1, { archetype: 'vekslak' });
    s = { ...s, tick: TICK_REVOLUTION_EVE + 100, regime: 0 };
    const ids = eligibleEvents(s).map((e) => e.id);
    expect(ids).not.toContain('kscControl');
    expect(ids).not.toContain('stbVisit');
    expect(ids).not.toContain('volby');
    // regime 0 would mean 1.4× fines before the revolution; now it is ignored
    expect(fineMult(s)).toBe(1);

    const planned = processPlan({ ...s, plan: null, nextPlanAt: 0 }, createRng(1));
    expect(planned.plan).toBeNull();
  });

  it('lustrace moves the kupón payout both ways', () => {
    const base = { ...freshState(), totalEarned: 500_000 };
    const plain = computeKupony(base);
    const hero = computeKupony({ ...base, stats: { ...base.stats, covered: 2 } });
    const traitor = computeKupony({ ...base, stats: { ...base.stats, reported: 3 } });
    expect(hero).toBeGreaterThan(plain);
    expect(traitor).toBeLessThan(plain);
  });
});

describe('sezónní eventy', () => {
  it('winter brings kalamita and chřipka, summer brings vedro', () => {
    const winter = { ...freshState(), tick: TICK_JAN_1989 };
    const winterIds = eligibleEvents(winter).map((e) => e.id);
    expect(winterIds).toContain('kalamita');
    expect(winterIds).toContain('chripka');
    expect(winterIds).not.toContain('vedro');

    const summer = { ...freshState(), tick: TICK_JUL_1988 };
    const summerIds = eligibleEvents(summer).map((e) => e.id);
    expect(summerIds).toContain('vedro');
    expect(summerIds).not.toContain('kalamita');
  });

  it('kalamita: shovelling costs elán and lifts the house', () => {
    let s = withTenant(freshState(), 1, { happiness: 60 });
    s = { ...s, tick: TICK_JAN_1989, energy: 100 };
    const opened = def('kalamita').apply(s, createRng(1));
    const shoveled = resolveChoice(opened, 'shovel');
    expect(shoveled.energy).toBe(100 - KALAMITA_ENERGY_COST);
    expect(shoveled.buildings[0].flats[1].tenant!.happiness).toBeGreaterThan(60);

    const skipped = resolveChoice(opened, 'skip');
    expect(skipped.buildings[0].flats[1].tenant!.happiness).toBeLessThan(60);
  });

  it('studená voda drags the happiness target down while active', () => {
    let s = withTenant(freshState(), 1, { happiness: 70 });
    const before = happinessTarget(s, s.buildings[0].flats[1]);
    s = { ...s, activeEvents: [{ id: 'studenaVoda', remaining: 60 }] };
    expect(happinessTarget(s, s.buildings[0].flats[1])).toBeLessThan(before);
  });
});

describe('balanc v0.9', () => {
  it('comfort above the knee is compressed into vysoké nároky', () => {
    let s = withTenant(freshState(), 1, { happiness: 70 });
    const base = happinessTarget(s, s.buildings[0].flats[1]);
    s = { ...s, upgrades: { ...s.upgrades, satellite: true } };
    // +20 raw comfort arrives clipped, not in full.
    expect(happinessTarget(s, s.buildings[0].flats[1])).toBe(
      base + 20 - comfortExcessLoss(20),
    );
    expect(comfortExcessLoss(20)).toBeGreaterThan(0);
  });

  it('elán regen scales with happiness and trust', () => {
    expect(brigadeRegen(60, 50)).toBeCloseTo(4.1, 5);
    expect(brigadeRegen(100, 100)).toBeGreaterThan(brigadeRegen(20, 20));
  });

  it('both standing meters drift toward the grey average', () => {
    let s = withTenant(freshState(), 1);
    s = {
      ...s,
      reputation: 100,
      regime: 100,
      nextPlanAt: 999999,
      // Already-earned milestone would pay +3 reputation and mask the drift.
      milestones: { ...s.milestones, firstFullFloor: true },
    };
    const next = tick(s);
    expect(next.reputation).toBeLessThan(100);
    expect(next.regime).toBeLessThan(100);

    let low = { ...s, reputation: 10, regime: 10 };
    low = tick(low);
    expect(low.reputation).toBeGreaterThan(10);
  });

  it('the ONV allocation multiplier follows the kádrový profil', () => {
    expect(regimeMoveInMult(0, false)).toBeLessThan(1);
    expect(regimeMoveInMult(100, false)).toBeGreaterThan(1);
    expect(regimeMoveInMult(0, true)).toBe(1);
  });
});

describe('migrace v9', () => {
  it('adds regime, spy stats and tenant secret fields to a v8 save', () => {
    const old = freshState();
    const b = old.buildings[0];
    const legacyTenant = { ...b.flats[0].tenant! } as Partial<
      NonNullable<GameState['buildings'][0]['flats'][0]['tenant']>
    >;
    delete legacyTenant.secret;
    delete legacyTenant.secretKnown;
    delete legacyTenant.confided;
    delete legacyTenant.covered;
    delete legacyTenant.arrestAt;
    const legacy = {
      ...old,
      version: 8,
      buildings: [
        {
          ...b,
          flats: b.flats.map((f, i) =>
            i === 0
              ? { ...f, tenant: { ...(legacyTenant as NonNullable<typeof f.tenant>), archetype: 'vekslak' as const } }
              : f,
          ),
        },
      ],
    } as GameState;
    delete (legacy as Partial<GameState>).regime;

    const migrated = migrateSave(legacy, 8);
    expect(migrated.regime).toBe(STARTING_REGIME);
    expect(migrated.stats.reported).toBe(0);
    expect(migrated.meta.badges.konfident).toBe(false);
    const t = migrated.buildings[0].flats[0].tenant!;
    expect(t.secret).toBe('veksl'); // the vekslák’s secret is no secret
    expect(t.secretKnown).toBe(false);
    expect(t.arrestAt).toBeNull();
  });
});
