// Parcels: 10 sites, player-chosen, with an era-gated cap on how many houses
// may exist (spec: build where you like, one extra parcel per privatizace).

import { afterEach, describe, expect, it } from 'vitest';
import { useGame } from '../store';
import { freshState } from './helpers';
import { buildingCap, plotCost, TOTAL_PARCELS, BUILDINGS_BASE, SITES } from '../economy';
import type { GameState } from '../types';

function seed(game: GameState) {
  useGame.setState({ game, offlineSummary: null, helpOpen: false });
}

afterEach(() => {
  useGame.setState({ game: freshState(), offlineSummary: null, helpOpen: false });
});

describe('buildingCap', () => {
  it('is BUILDINGS_BASE in the first era and grows by one per éra', () => {
    expect(buildingCap(0)).toBe(BUILDINGS_BASE);
    expect(buildingCap(1)).toBe(BUILDINGS_BASE + 1);
    expect(buildingCap(4)).toBe(BUILDINGS_BASE + 4);
  });

  it('never exceeds the ten parcels', () => {
    expect(buildingCap(50)).toBe(TOTAL_PARCELS);
    expect(TOTAL_PARCELS).toBe(10);
  });
});

describe('plotCost', () => {
  it('gives the starting house away and escalates from there', () => {
    expect(plotCost(0)).toBe(0);
    expect(plotCost(1)).toBe(25000);
    expect(plotCost(2)).toBeGreaterThan(plotCost(1));
    expect(plotCost(3)).toBeGreaterThan(plotCost(2));
  });
});

describe('buyPlot', () => {
  it('builds on the chosen free parcel and charges the plot price', () => {
    seed({ ...freshState(), money: 1_000_000 });
    useGame.getState().buyPlot(5);
    const st = useGame.getState();
    expect(st.game.buildings).toHaveLength(2);
    expect(st.game.buildings[1].site).toBe(5); // the parcel we picked
    expect(st.game.money).toBe(1_000_000 - plotCost(1));
    expect(st.activeBuilding).toBe(1);
  });

  it('refuses a parcel that is already built on', () => {
    seed({ ...freshState(), money: 1_000_000 });
    useGame.getState().buyPlot(0); // site 0 is the starting house
    expect(useGame.getState().game.buildings).toHaveLength(1);
  });

  it('refuses once the éra cap is reached', () => {
    // prestige 0 → cap 3. Fill to the cap, then a fourth is blocked.
    seed({ ...freshState(), money: 100_000_000 });
    useGame.getState().buyPlot(1);
    useGame.getState().buyPlot(2);
    expect(useGame.getState().game.buildings).toHaveLength(BUILDINGS_BASE);
    useGame.getState().buyPlot(3); // one past the era cap
    expect(useGame.getState().game.buildings).toHaveLength(BUILDINGS_BASE);
  });

  it('a higher prestige level lifts the cap', () => {
    const base = freshState();
    seed({ ...base, money: 100_000_000, meta: { ...base.meta, prestigeLevel: 1 } });
    useGame.getState().buyPlot(1);
    useGame.getState().buyPlot(2);
    useGame.getState().buyPlot(3); // cap is now 4, so this one lands
    expect(useGame.getState().game.buildings).toHaveLength(BUILDINGS_BASE + 1);
  });

  it('refuses an out-of-range parcel index', () => {
    seed({ ...freshState(), money: 1_000_000 });
    useGame.getState().buyPlot(SITES.length); // no such parcel
    expect(useGame.getState().game.buildings).toHaveLength(1);
  });
});
