import { describe, expect, it } from 'vitest';
import { computeOffline, OFFLINE_CAP_SECONDS, OFFLINE_RATE } from '../offline';
import { incomePerSec } from '../economy';
import { freshState } from './helpers';

const s = freshState();
const rate = incomePerSec(s);

describe('computeOffline', () => {
  it('returns null for absences under a minute', () => {
    expect(computeOffline(s, 59)).toBeNull();
    expect(computeOffline(s, 0)).toBeNull();
  });

  it('pays 50 % of current income for 1 minute away', () => {
    const r = computeOffline(s, 60)!;
    expect(r).not.toBeNull();
    expect(r.counted).toBe(60);
    expect(r.capped).toBe(false);
    expect(r.earned).toBe(Math.floor(rate * OFFLINE_RATE * 60));
  });

  it('pays for a full hour away', () => {
    const r = computeOffline(s, 3600)!;
    expect(r.counted).toBe(3600);
    expect(r.capped).toBe(false);
    expect(r.earned).toBe(Math.floor(rate * OFFLINE_RATE * 3600));
  });

  it('caps a 9-hour absence at 8 hours', () => {
    const r = computeOffline(s, 9 * 3600)!;
    expect(r.counted).toBe(OFFLINE_CAP_SECONDS);
    expect(r.capped).toBe(true);
    expect(r.earned).toBe(Math.floor(rate * OFFLINE_RATE * OFFLINE_CAP_SECONDS));
  });

  it('picks flavor deterministically for the same absence', () => {
    expect(computeOffline(s, 3600)!.flavor).toBe(computeOffline(s, 3600)!.flavor);
  });
});
