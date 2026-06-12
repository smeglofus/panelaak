import { describe, expect, it } from 'vitest';
import {
  floorCost,
  FLOOR_COST_GROWTH,
  formatKcs,
  formatKcsPerSec,
  formatNumberCs,
  HAPPINESS_RENT_FLOOR,
  moveInChance,
  rentPerSec,
} from '../economy';

const NBSP = '\u00a0';

describe('floorCost', () => {
  it('matches the spec curve 500 * 2.2^n (n = bought floors)', () => {
    expect(floorCost(1)).toBe(500); // first purchase, n = 0
    expect(floorCost(2)).toBe(1100);
    expect(floorCost(3)).toBe(2420);
  });

  it('grows by the configured ratio', () => {
    for (let n = 1; n < 7; n++) {
      expect(floorCost(n + 1) / floorCost(n)).toBeCloseTo(FLOOR_COST_GROWTH, 1);
    }
  });
});

describe('rentPerSec', () => {
  it('pays full rent at 100 % happiness', () => {
    expect(rentPerSec(1, 100)).toBeCloseTo(1);
    expect(rentPerSec(1.5, 100)).toBeCloseTo(1.5);
  });

  it('never drops below the 0.2 trickle floor at zero happiness (no dead state)', () => {
    expect(rentPerSec(1, 0)).toBeCloseTo(HAPPINESS_RENT_FLOOR);
    expect(rentPerSec(0.6, 0)).toBeGreaterThan(0);
  });

  it('interpolates the happiness factor between 0.2 and 1.0', () => {
    expect(rentPerSec(1, 50)).toBeCloseTo(0.6);
  });
});

describe('moveInChance', () => {
  it('is ~10 % per 10 s per vacant flat at reputation 50 (spec §6.3)', () => {
    expect(moveInChance(50)).toBeCloseTo(0.01);
  });

  it('scales with reputation', () => {
    expect(moveInChance(100)).toBeGreaterThan(moveInChance(0));
  });
});

describe('Czech formatting', () => {
  it('groups thousands with non-breaking spaces', () => {
    expect(formatKcs(1250)).toBe(`1${NBSP}250${NBSP}Kčs`);
    expect(formatKcs(1234567)).toBe(`1${NBSP}234${NBSP}567${NBSP}Kčs`);
    expect(formatKcs(999)).toBe(`999${NBSP}Kčs`);
  });

  it('floors fractional money for display', () => {
    expect(formatKcs(1250.9)).toBe(`1${NBSP}250${NBSP}Kčs`);
  });

  it('uses a decimal comma for rates', () => {
    expect(formatKcsPerSec(3.24)).toBe(`3,2${NBSP}Kčs/s`);
    expect(formatNumberCs(0.5, 1)).toBe('0,5');
  });
});
