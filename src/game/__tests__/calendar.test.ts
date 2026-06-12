import { describe, expect, it } from 'vitest';
import {
  dateFromTick,
  dateJustReached,
  formatDateCs,
  isSummer,
  isWinter,
  SECONDS_PER_DAY,
} from '../calendar';

describe('calendar', () => {
  it('starts on 1. dubna 1983', () => {
    expect(dateFromTick(0)).toEqual({ year: 1983, month: 4, day: 1 });
    expect(formatDateCs(dateFromTick(0))).toBe('1. dubna 1983');
  });

  it('advances one day per 30 seconds', () => {
    expect(dateFromTick(SECONDS_PER_DAY)).toEqual({ year: 1983, month: 4, day: 2 });
    expect(dateFromTick(30 * SECONDS_PER_DAY)).toEqual({ year: 1983, month: 5, day: 1 });
  });

  it('rolls over the year', () => {
    const newYear = dateFromTick(270 * SECONDS_PER_DAY); // 270 days after 1.4. = 1.1.
    expect(newYear).toEqual({ year: 1984, month: 1, day: 1 });
  });

  it('knows the seasons', () => {
    expect(isWinter(dateFromTick(0))).toBe(false); // duben
    expect(isSummer(dateFromTick(90 * SECONDS_PER_DAY))).toBe(true); // červenec
    expect(isWinter(dateFromTick(240 * SECONDS_PER_DAY))).toBe(true); // prosinec
  });

  it('detects the exact tick a date is reached', () => {
    const july1 = 90 * SECONDS_PER_DAY;
    expect(dateJustReached(july1, 7, 1)).toBe(true);
    expect(dateJustReached(july1 + 1, 7, 1)).toBe(false);
    expect(dateJustReached(july1 - 1, 7, 1)).toBe(false);
  });
});
