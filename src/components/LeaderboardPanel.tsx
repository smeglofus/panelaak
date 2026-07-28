// Leaderboard section for the Kariéra tab: shows the top administrators and
// lets the player submit their best score under a chosen nickname. All calls
// fail soft — with no backend the section just says it's unavailable.

import { useEffect, useState } from 'react';
import { CS } from '../game/content.cs';
import { useGame } from '../game/store';
import { formatKcs } from '../game/economy';
import {
  fetchLeaderboard,
  playerName,
  setPlayerName,
  submitScore,
  type LeaderboardEntry,
} from '../leaderboard';

export default function LeaderboardPanel() {
  const game = useGame((s) => s.game);
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(playerName());
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);

  // Best of the richest completed era and the current era's running total —
  // so even a player who hasn't privatized yet has a meaningful score.
  const myScore = Math.max(game.meta.records.richestEraEarned, Math.floor(game.totalEarned));

  const load = async () => {
    setLoading(true);
    setEntries(await fetchLeaderboard(20));
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async () => {
    if (sending) return;
    setSending(true);
    setPlayerName(name);
    setStatus(CS.leaderboard.submitting);
    try {
      const res = await submitScore({
        score: myScore,
        era: game.meta.prestigeLevel,
        kupony: game.meta.records.kuponyEarnedTotal,
      });
      if (res.ok) {
        setStatus(CS.leaderboard.submitted(res.rank ?? 0));
        void load();
      } else {
        // A refused submit is not a missing backend — say which it was.
        setStatus(CS.leaderboard[res.reason]);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="panel-section">
      <h3>{CS.leaderboard.title}</h3>
      <p className="brigade-hint">{CS.leaderboard.yourScore(formatKcs(myScore))}</p>
      <input
        className="lb-name"
        type="text"
        maxLength={24}
        placeholder={CS.leaderboard.namePlaceholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button
        type="button"
        className="btn btn-brigade"
        disabled={sending}
        onClick={() => void submit()}
      >
        {CS.leaderboard.submit}
      </button>
      {status && <p className="brigade-hint">{status}</p>}

      {loading ? (
        <p className="brigade-hint">{CS.leaderboard.loading}</p>
      ) : entries === null ? (
        <p className="brigade-hint">{CS.leaderboard.offline}</p>
      ) : entries.length === 0 ? (
        <p className="brigade-hint">{CS.leaderboard.empty}</p>
      ) : (
        <>
          <ol className="leaderboard">
            {entries.map((e, i) => (
              <li key={i}>
                <span className="lb-rank">{i + 1}.</span>
                <span className="lb-name-cell">{e.name}</span>
                <span className="lb-score">
                  {formatKcs(e.score)}
                  {e.era > 0 && <span className="lb-era"> · {CS.leaderboard.era(e.era)}</span>}
                </span>
              </li>
            ))}
          </ol>
          <button type="button" className="btn-newgame" onClick={() => void load()}>
            {CS.leaderboard.refresh}
          </button>
        </>
      )}
    </section>
  );
}
