// A refused submit must not be reported as "the leaderboard is unavailable":
// clicking Submit twice trips the server's per-player cooldown (429), which is
// a "wait a moment", not a missing backend.

import { describe, expect, it } from 'vitest';
import { failureFromStatus } from '../../leaderboard';

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
