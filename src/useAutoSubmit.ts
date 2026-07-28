// Keeps an opted-in player's leaderboard entry fresh while they play, so the
// board reflects the game instead of the last time someone remembered to click
// Submit. Mounted once from App — the panel it belongs to is only rendered
// while its tab is open, which would be too fragile to hang a timer on.

import { useEffect } from 'react';
import { useGame } from './game/store';
import {
  autoSubmitEnabled,
  lastSubmittedAt,
  lastSubmittedScore,
  markSubmitted,
  shouldAutoSubmit,
  submitScore,
} from './leaderboard';

/** How often the condition is re-checked (the send interval is an hour). */
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function useAutoSubmit(): void {
  useEffect(() => {
    const check = () => {
      const game = useGame.getState().game;
      const score = Math.max(game.meta.records.richestEraEarned, Math.floor(game.totalEarned));
      const ok = shouldAutoSubmit({
        enabled: autoSubmitEnabled(),
        // A hidden tab is a player who isn't playing; don't speak for them.
        visible: document.visibilityState === 'visible',
        score,
        lastScore: lastSubmittedScore(),
        lastAt: lastSubmittedAt(),
        now: Date.now(),
      });
      if (!ok) return;

      void submitScore({
        score,
        era: game.meta.prestigeLevel,
        kupony: game.meta.records.kuponyEarnedTotal,
      }).then((res) => {
        // Only a landed submit counts — a refused one must not start the clock,
        // or a rate-limited retry would push the next attempt an hour away.
        if (res.ok) markSubmitted(score);
      });
    };

    const id = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);
}
