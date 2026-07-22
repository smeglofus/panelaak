import { describe, expect, it } from 'vitest';
import { tick } from '../tick';
import { applyPrestige } from '../prestige';
import { decodeSave, encodeSave, migrateSave, SAVE_VERSION } from '../state';
import { seasonKey, SECONDS_PER_DAY } from '../calendar';
import type { GameState } from '../types';
import { freshState, withFloors, withTenant } from './helpers';

describe('seasons', () => {
  it('maps the calendar onto four seasons', () => {
    expect(seasonKey({ year: 1988, month: 4, day: 1 })).toBe('spring');
    expect(seasonKey({ year: 1988, month: 7, day: 1 })).toBe('summer');
    expect(seasonKey({ year: 1988, month: 10, day: 1 })).toBe('autumn');
    expect(seasonKey({ year: 1988, month: 1, day: 1 })).toBe('winter');
  });
});

describe('síň slávy records', () => {
  it('tracks the best income per second', () => {
    let s = withTenant(withFloors(freshState(), 1), 0, { happiness: 90 });
    s = tick(s);
    expect(s.meta.records.bestIncomePerSec).toBeGreaterThan(0);
  });

  it('remembers the fastest Vzorný dům and keeps the better time', () => {
    let s = withFloors(freshState(), 8);
    for (const f of s.buildings[0].flats) {
      s = withTenant(s, f.index, { happiness: 90 });
    }
    s = { ...s, tick: 5000 };
    const first = tick(s);
    expect(first.milestones.vzornyDum).toBe(true);
    expect(first.meta.records.fastestVzornyTicks).toBe(5001);

    // A slower run must not overwrite an existing better record.
    const slower = {
      ...s,
      meta: { ...s.meta, records: { ...s.meta.records, fastestVzornyTicks: 900 } },
    };
    expect(tick(slower).meta.records.fastestVzornyTicks).toBe(900);
  });

  it('prestige archives era earnings and total kupóny', () => {
    let s = freshState();
    s = {
      ...s,
      tick: (270 + 360) * SECONDS_PER_DAY,
      totalEarned: 125000,
    };
    const next = applyPrestige(s, 42);
    expect(next.meta.records.richestEraEarned).toBe(125000);
    expect(next.meta.records.kuponyEarnedTotal).toBeGreaterThan(0);
    // A poorer following era must not lower the record.
    const poorer = applyPrestige(
      { ...next, tick: (270 + 360) * SECONDS_PER_DAY, totalEarned: 500 },
      43,
    );
    expect(poorer.meta.records.richestEraEarned).toBe(125000);
  });

  it('migration v7 adds records to an old meta', () => {
    const old = freshState();
    const legacyMeta = { ...old.meta } as Partial<GameState['meta']>;
    delete legacyMeta.records;
    const legacy = { ...old, version: 6, meta: legacyMeta as GameState['meta'] };
    const migrated = migrateSave(legacy, 6);
    expect(migrated.meta.records.fastestVzornyTicks).toBeNull();
    expect(migrated.version).toBe(SAVE_VERSION);
  });
});

describe('save export/import', () => {
  it('round-trips a state through the backup blob', () => {
    const s = { ...withTenant(freshState(), 1, { happiness: 42 }), money: 1234.5 };
    const decoded = decodeSave(encodeSave(s))!;
    expect(decoded).not.toBeNull();
    expect(decoded.money).toBe(1234.5);
    expect(decoded.buildings[0].flats[1].tenant!.happiness).toBe(42);
  });

  it('rejects garbage and saves from the future', () => {
    expect(decodeSave('rozhodně ne base64')).toBeNull();
    expect(decodeSave(btoa('{"jen": "tak"}'))).toBeNull();
    const future = { ...freshState(), version: 99 };
    expect(decodeSave(encodeSave(future))).toBeNull();
  });
});
