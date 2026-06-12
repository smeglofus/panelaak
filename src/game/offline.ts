// Offline progress fast-forward (spec §6.8): pure calculation, no event
// simulation — rent at a reduced rate, capped, plus one line of flavor.

import type { GameState } from './types';
import { CS } from './content.cs';
import { incomePerSec } from './economy';

export const OFFLINE_RATE = 0.5;
export const OFFLINE_CAP_SECONDS = 8 * 3600;
export const OFFLINE_MIN_SECONDS = 60;

export interface OfflineSummary {
  /** Real seconds the player was away. */
  elapsed: number;
  /** Seconds that actually counted (after the 8 h cap). */
  counted: number;
  earned: number;
  capped: boolean;
  flavor: string;
}

/**
 * Returns null when the absence is too short to bother the player with a modal.
 * Earnings use the income rate of the state as it was saved — happiness and
 * occupancy are snapshots, nothing "happens" offline except rent.
 */
export function computeOffline(state: GameState, elapsedSeconds: number): OfflineSummary | null {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < OFFLINE_MIN_SECONDS) return null;

  const counted = Math.min(elapsedSeconds, OFFLINE_CAP_SECONDS);
  const earned = Math.floor(incomePerSec(state) * OFFLINE_RATE * counted);
  const flavorPool = CS.offline.flavor;
  // Deterministic pick — same absence, same story.
  const flavor = flavorPool[Math.floor(elapsedSeconds) % flavorPool.length];

  return {
    elapsed: elapsedSeconds,
    counted,
    earned,
    capped: elapsedSeconds > OFFLINE_CAP_SECONDS,
    flavor,
  };
}
