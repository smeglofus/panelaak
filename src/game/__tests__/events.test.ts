import { describe, expect, it } from 'vitest';
import { eligibleEvents, EVENTS, processEvents, resolveChoice } from '../events';
import { createRng } from '../rng';
import { AZOR_SEARCH_COST, SCHUZE_COST } from '../economy';
import { freshState, withFloors, withTenant } from './helpers';

const def = (id: string) => EVENTS.find((e) => e.id === id)!;

describe('event definitions are data, not code branches (spec §6.5)', () => {
  it('has at least the 6 MVP events', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(6);
  });

  it('has unique ids and positive weights', () => {
    const ids = EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of EVENTS) expect(e.weight).toBeGreaterThan(0);
  });
});

describe('eligibility conditions', () => {
  it('StB visit requires a vekslák in the building', () => {
    const without = freshState();
    expect(eligibleEvents(without).map((e) => e.id)).not.toContain('stbVisit');

    const withVekslak = withTenant(freshState(), 1, { archetype: 'vekslak' });
    expect(eligibleEvents(withVekslak).map((e) => e.id)).toContain('stbVisit');
  });

  it('satellite report requires the satellite upgrade', () => {
    const s = freshState();
    expect(eligibleEvents(s).map((e) => e.id)).not.toContain('satelliteReported');
    const owned = { ...s, upgrades: { ...s.upgrades, satellite: true } };
    expect(eligibleEvents(owned).map((e) => e.id)).toContain('satelliteReported');
  });

  it('an already-active timed event is not eligible again', () => {
    const s = { ...freshState(), activeEvents: [{ id: 'hotWater', remaining: 60 }] };
    expect(eligibleEvents(s).map((e) => e.id)).not.toContain('hotWater');
  });
});

describe('kontrola z OV KSČ', () => {
  it('fines a building in bad shape and costs reputation', () => {
    let s = withFloors(freshState(), 1);
    s = withTenant(s, 0, { happiness: 10 });
    s = { ...s, money: 500 };
    const next = def('kscControl').apply(s, createRng(1));
    expect(next.money).toBeLessThan(500);
    expect(next.reputation).toBeLessThan(s.reputation);
  });

  it('praises a building in good shape', () => {
    const s = withTenant(freshState(), 1, { happiness: 90 });
    const next = def('kscControl').apply(s, createRng(1));
    expect(next.money).toBe(s.money);
    expect(next.reputation).toBeGreaterThan(s.reputation);
  });
});

describe('návštěva StB', () => {
  // The 50/50 branch comes from the rng — scan for a seed per branch.
  // The first draw picks the suspect flat, the second decides the outcome.
  let seedGone = -1;
  let seedFee = -1;
  for (let i = 1; i < 100 && (seedGone < 0 || seedFee < 0); i++) {
    const r = createRng(i);
    r.next(); // suspect pick
    if (r.next() < 0.5) {
      if (seedGone < 0) seedGone = i;
    } else if (seedFee < 0) {
      seedFee = i;
    }
  }

  it('can make the vekslák disappear overnight', () => {
    const s = withTenant(freshState(), 1, { archetype: 'vekslak' });
    const next = def('stbVisit').apply(s, createRng(seedGone));
    expect(next.buildings[0].flats[1].tenant).toBeNull();
    expect(next.stats.moveOuts).toBe(s.stats.moveOuts + 1);
  });

  it('can charge a "fee" from the player money instead', () => {
    let s = withTenant(freshState(), 1, { archetype: 'vekslak' });
    s = { ...s, money: 1000 };
    const next = def('stbVisit').apply(s, createRng(seedFee));
    expect(next.money).toBeLessThan(1000);
    expect(next.buildings[0].flats[1].tenant).not.toBeNull();
  });
});

describe('mejdan u Lojzy', () => {
  it('hits happiness on the drunk’s floor only', () => {
    let s = withFloors(freshState(), 2);
    s = withTenant(s, 0, { archetype: 'drunk', happiness: 50 });
    s = withTenant(s, 1, { archetype: 'shift', happiness: 60 });
    s = withTenant(s, 2, { archetype: 'shift', happiness: 60 }); // floor 2
    const next = def('mejdan').apply(s, createRng(1));
    const flats = next.buildings[0].flats;
    expect(flats[0].tenant!.happiness).toBeLessThan(50);
    expect(flats[1].tenant!.happiness).toBeLessThan(60);
    expect(flats[2].tenant!.happiness).toBe(60);
  });
});

describe('satelit: soused to nahlásil (spec §6.6 acceptance)', () => {
  it('removes the upgrade and charges the fine — and it can be re-bought', () => {
    let s = freshState();
    s = { ...s, money: 1000, upgrades: { ...s.upgrades, satellite: true } };
    const next = def('satelliteReported').apply(s, createRng(1));
    expect(next.upgrades.satellite).toBe(false);
    expect(next.money).toBeLessThan(1000);
    expect(next.log.some((e) => e.text.includes('Satelit zabaven'))).toBe(true);
  });
});

describe('domovní schůze', () => {
  it('opens a choice with pay disabled when money is short', () => {
    const rich = def('schuze').apply({ ...freshState(), money: 500 }, createRng(1));
    expect(rich.pendingChoice).not.toBeNull();
    expect(rich.pendingChoice!.options).toHaveLength(2);
    expect(rich.pendingChoice!.options[0].disabled).toBe(false);

    const poor = def('schuze').apply({ ...freshState(), money: 10 }, createRng(1));
    expect(poor.pendingChoice!.options[0].disabled).toBe(true);
  });

  it('paying for chlebíčky costs 50 Kčs and lifts happiness', () => {
    let s = def('schuze').apply({ ...freshState(), money: 500 }, createRng(1));
    const before = s.buildings[0].flats[0].tenant!.happiness;
    s = resolveChoice(s, 'pay');
    expect(s.pendingChoice).toBeNull();
    expect(s.money).toBe(500 - SCHUZE_COST);
    expect(s.buildings[0].flats[0].tenant!.happiness).toBeGreaterThan(before);
  });

  it('skipping is free but the neighbours remember', () => {
    let s = def('schuze').apply({ ...freshState(), money: 500 }, createRng(1));
    const before = s.buildings[0].flats[0].tenant!.happiness;
    s = resolveChoice(s, 'skip');
    expect(s.money).toBe(500);
    expect(s.buildings[0].flats[0].tenant!.happiness).toBeLessThan(before);
  });
});

describe('melouch', () => {
  it('requires a leak and then fixes one for free', () => {
    expect(eligibleEvents(freshState()).map((e) => e.id)).not.toContain('melouch');

    let s = freshState();
    const b = s.buildings[0];
    s = {
      ...s,
      buildings: [
        { ...b, flats: b.flats.map((f) => (f.index === 0 ? { ...f, problem: 'leak' as const } : f)) },
      ],
    };
    expect(eligibleEvents(s).map((e) => e.id)).toContain('melouch');
    const next = def('melouch').apply(s, createRng(1));
    expect(next.buildings[0].flats[0].problem).toBeNull();
    expect(next.money).toBe(s.money); // free, that's the point
  });
});

describe('jitrnice', () => {
  it('needs the crane operator and lifts the whole house', () => {
    const s = freshState(); // Marta (shift) lives in flat 0 from the start
    expect(eligibleEvents(s).map((e) => e.id)).toContain('jitrnice');
    const before = s.buildings[0].flats[0].tenant!.happiness;
    const next = def('jitrnice').apply(s, createRng(1));
    expect(next.buildings[0].flats[0].tenant!.happiness).toBeGreaterThan(before);
  });
});

describe('svazák a StB (v0.2 archetypes)', () => {
  it('KSČ control always praises when a svazák lives in the house', () => {
    let s = withFloors(freshState(), 1);
    s = withTenant(s, 0, { archetype: 'svazak', happiness: 5 }); // terrible shape
    s = { ...s, money: 500 };
    const next = def('kscControl').apply(s, createRng(1));
    expect(next.money).toBe(500); // no fine
    expect(next.reputation).toBeGreaterThan(s.reputation);
  });

  it('a disident makes the StB visit possible', () => {
    const s = withTenant(freshState(), 1, { archetype: 'disident' });
    expect(eligibleEvents(s).map((e) => e.id)).toContain('stbVisit');
  });
});

describe('dvorek events', () => {
  it('okno requires the sandbox and breaks a window', () => {
    let s = withTenant(freshState(), 1, { happiness: 70 });
    expect(eligibleEvents(s).map((e) => e.id)).not.toContain('okno');
    s = { ...s, courtyard: { ...s.courtyard, piskoviste: true } };
    expect(eligibleEvents(s).map((e) => e.id)).toContain('okno');
    const next = def('okno').apply(s, createRng(1));
    expect(next.buildings[0].flats.some((f) => f.problem === 'window')).toBe(true);
  });

  it('trabant stops appearing once the garage is built', () => {
    let s = withFloors(freshState(), 2);
    expect(eligibleEvents(s).map((e) => e.id)).toContain('trabant');
    s = { ...s, courtyard: { ...s.courtyard, garaz: true } };
    expect(eligibleEvents(s).map((e) => e.id)).not.toContain('trabant');
  });

  it('Azor: paying for the search lifts the house, ignoring it hurts pensioners', () => {
    const base = withTenant(freshState(), 1, { archetype: 'pensioner', happiness: 60 });
    const s = def('azor').apply({ ...base, money: 500 }, createRng(1));
    expect(s.pendingChoice?.eventId).toBe('azor');

    const found = resolveChoice(s, 'search');
    expect(found.money).toBe(500 - AZOR_SEARCH_COST);
    expect(found.buildings[0].flats[1].tenant!.happiness).toBeGreaterThan(60);

    const ignored = resolveChoice(s, 'skip');
    expect(ignored.money).toBe(500);
    expect(ignored.buildings[0].flats[1].tenant!.happiness).toBeLessThan(60);
  });
});

describe('timed events expire', () => {
  it('hot water comes back and logs it', () => {
    let s = { ...freshState(), tick: 10, activeEvents: [{ id: 'hotWater', remaining: 1 }] };
    s = processEvents(s, createRng(1));
    expect(s.activeEvents).toHaveLength(0);
    expect(s.log.some((e) => e.text.includes('opět teče'))).toBe(true);
  });
});
