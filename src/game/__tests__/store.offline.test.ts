// Regression: an open tab whose loop was frozen (laptop asleep / heavy
// background throttling) must settle the elapsed wall-clock time as offline
// rent — not advance a single tick and swallow the gap.

import { afterEach, describe, expect, it } from 'vitest';
import { useGame } from '../store';
import { freshState, withFloors, withTenant } from './helpers';
import { incomePerSec } from '../economy';
import { OFFLINE_MIN_SECONDS } from '../offline';
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
    expect(incomePerSec(g)).toBeGreaterThan(0);
    seed({ ...g, money: 0, lastSaved: Date.now() - 3600 * 1000 }); // 1 h frozen

    useGame.getState().tickOnce();

    const st = useGame.getState();
    expect(st.offlineSummary).not.toBeNull();
    expect(st.offlineSummary!.counted).toBeGreaterThanOrEqual(3599);
    expect(st.game.money).toBeGreaterThan(0);
  });

  it('keeps ticking normally for a sub-threshold gap', () => {
    const g = withTenant(withFloors(freshState(), 1), 0);
    seed({ ...g, lastSaved: Date.now() - (OFFLINE_MIN_SECONDS - 5) * 1000 });

    useGame.getState().tickOnce();

    expect(useGame.getState().offlineSummary).toBeNull();
  });
});
