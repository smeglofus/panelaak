// A refused submit must not be reported as "the leaderboard is unavailable":
// clicking Submit twice trips the server's per-player cooldown (429), which is
// a "wait a moment", not a missing backend.

import { describe, expect, it } from 'vitest';
import {
  AUTO_SUBMIT_INTERVAL_MS,
  failureFromStatus,
  shouldAutoSubmit,
} from '../../leaderboard';

describe('failureFromStatus', () => {
  it('reads the submit cooldown as its own thing', () => {
    expect(failureFromStatus(429)).toBe('rateLimited');
  });

  it('reads a refused payload as rejected', () => {
    expect(failureFromStatus(400)).toBe('rejected');
    expect(failureFromStatus(404)).toBe('rejected');
  });

  it('treats a broken backend the same as an absent one', () => {
    expect(failureFromStatus(500)).toBe('offline');
    expect(failureFromStatus(502)).toBe('offline');
  });
});

describe('shouldAutoSubmit', () => {
  const base = {
    enabled: true,
    visible: true,
    score: 2000,
    lastScore: 1000,
    lastAt: 0,
    now: AUTO_SUBMIT_INTERVAL_MS,
  };

  it('sends once the interval has passed and the score improved', () => {
    expect(shouldAutoSubmit(base)).toBe(true);
  });

  it('never sends for a player who has not opted in', () => {
    expect(shouldAutoSubmit({ ...base, enabled: false })).toBe(false);
  });

  it('stays quiet while the tab is hidden — that is not an active player', () => {
    expect(shouldAutoSubmit({ ...base, visible: false })).toBe(false);
  });

  it('waits out the full interval', () => {
    expect(shouldAutoSubmit({ ...base, now: AUTO_SUBMIT_INTERVAL_MS - 1 })).toBe(false);
  });

  it('does not resend a score that has not improved', () => {
    expect(shouldAutoSubmit({ ...base, score: 1000, lastScore: 1000 })).toBe(false);
    expect(shouldAutoSubmit({ ...base, score: 900, lastScore: 1000 })).toBe(false);
  });
});
