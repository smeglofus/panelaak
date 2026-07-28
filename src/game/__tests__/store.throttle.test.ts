// Regression: a tab left open in the background gets its timers throttled to
// roughly one fire per minute. That gap used to trip the offline catch-up,
// which opened the summary modal — and because an open modal refreshes
// lastSaved on every tick, every further hour of the absence was silently
// discarded. The player came back to "Byl/a jste pryč 1 min." after hours away.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../store';
import { freshState, withFloors, withTenant } from './helpers';
import { incomePerSec } from '../economy';
import { OFFLINE_RATE } from '../offline';
import type { GameState } from '../types';

function seed(game: GameState) {
  useGame.setState({ game, offlineSummary: null, helpOpen: false });
}

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  vi.useRealTimers();
  useGame.setState({ game: freshState(), offlineSummary: null, helpOpen: false });
});

describe('background-tab throttling', () => {
  it('credits the whole absence, not just the first throttled minute', () => {
    const g = withTenant(withFloors(freshState(), 2), 0);
    const rate = incomePerSec(g);
    expect(rate).toBeGreaterThan(0);

    const start = Date.now();
    seed({ ...g, money: 0, lastSaved: start });

    // Three hours of a hidden tab: the browser fires the interval about once
    // per minute instead of once per second.
    const minutes = 180;
    for (let i = 1; i <= minutes; i++) {
      vi.setSystemTime(start + i * 60_000);
      useGame.getState().tickOnce();
    }

    const expected = rate * OFFLINE_RATE * minutes * 60;
    const money = useGame.getState().game.money;
    // Allow a wide margin — what matters is hours vs. a single minute.
    expect(money).toBeGreaterThan(expected * 0.9);
  });

  it('does not pop the offline modal for an in-session gap', () => {
    const g = withTenant(withFloors(freshState(), 2), 0);
    const start = Date.now();
    seed({ ...g, lastSaved: start });

    vi.setSystemTime(start + 120_000); // two throttled minutes
    useGame.getState().tickOnce();

    // The summary belongs to page loads; raising it here pauses a tab the
    // player is not even looking at.
    expect(useGame.getState().offlineSummary).toBeNull();
  });
});
