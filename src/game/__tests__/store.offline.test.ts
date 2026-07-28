// Regression: an open tab whose loop was frozen (laptop asleep / heavy
// background throttling) must settle the elapsed wall-clock time as offline
// rent — not advance a single tick and swallow the gap.

import { afterEach, describe, expect, it } from 'vitest';
import { useGame } from '../store';
import { freshState, withFloors, withTenant } from './helpers';
import { incomePerSec } from '../economy';
import { OFFLINE_MIN_SECONDS, OFFLINE_RATE } from '../offline';
import type { GameState } from '../types';

function seed(game: GameState) {
  useGame.setState({ game, offlineSummary: null, helpOpen: false });
}

afterEach(() => {
  useGame.setState({ game: freshState(), offlineSummary: null, helpOpen: false });
});

describe('tickOnce offline catch-up', () => {
  it('settles a long frozen gap as offline rent', () => {
    const g = withTenant(withFloors(freshState(), 1), 0);
    const rate = incomePerSec(g);
    expect(rate).toBeGreaterThan(0);
    seed({ ...g, money: 0, lastSaved: Date.now() - 3600 * 1000 }); // 1 h frozen

    useGame.getState().tickOnce();

    const st = useGame.getState();
    // The hour is credited in full — the gap must not be swallowed…
    expect(st.game.money).toBeGreaterThan(rate * OFFLINE_RATE * 3600 * 0.9);
    // …but silently: the summary modal is for page loads, not for a tab the
    // browser merely throttled (see store.throttle.test.ts).
    expect(st.offlineSummary).toBeNull();
  });

  it('still shows the summary on the page-load path', () => {
    // What onRehydrateStorage does: measure the absence once, with the player
    // actually there to read it.
    const g = withTenant(withFloors(freshState(), 1), 0);
    seed({ ...g, money: 0, lastSaved: Date.now() - 3600 * 1000 });

    useGame.getState().applyOfflineProgress();

    const st = useGame.getState();
    expect(st.offlineSummary).not.toBeNull();
    expect(st.offlineSummary!.counted).toBeGreaterThanOrEqual(3599);
  });

  it('keeps ticking normally for a sub-threshold gap', () => {
    const g = withTenant(withFloors(freshState(), 1), 0);
    seed({ ...g, lastSaved: Date.now() - (OFFLINE_MIN_SECONDS - 5) * 1000 });

    useGame.getState().tickOnce();

    expect(useGame.getState().offlineSummary).toBeNull();
  });
});
