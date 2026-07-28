// Client side of the leaderboard. Talks to the /api backend (see server/).
// The player is an anonymous UUID kept in localStorage plus a chosen nickname.
// Every call fails soft: with no backend (e.g. static GitHub Pages build) the
// UI just shows "unavailable" and the game plays on exactly as before.

export interface LeaderboardEntry {
  name: string;
  score: number;
  era: number;
  kupony: number;
}

const PID_KEY = 'panelak-player-id';
const NAME_KEY = 'panelak-player-name';
const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

/** Stable anonymous id for this browser; created and stored on first use. */
export function playerId(): string {
  let id = localStorage.getItem(PID_KEY);
  if (!id || !ID_RE.test(id)) {
    const rand = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    id = `p-${rand}`;
    localStorage.setItem(PID_KEY, id);
  }
  return id;
}

export function playerName(): string {
  return localStorage.getItem(NAME_KEY) ?? '';
}

export function setPlayerName(name: string): void {
  localStorage.setItem(NAME_KEY, name.slice(0, 24));
}

export async function submitScore(input: {
  score: number;
  era: number;
  kupony: number;
}): Promise<{ ok: boolean; rank?: number }> {
  try {
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ playerId: playerId(), name: playerName(), ...input }),
    });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as { rank?: number };
    return { ok: true, rank: data.rank };
  } catch {
    return { ok: false };
  }
}

export async function fetchLeaderboard(limit = 20): Promise<LeaderboardEntry[] | null> {
  try {
    const res = await fetch(`/api/leaderboard?limit=${limit}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { entries: LeaderboardEntry[] };
    return data.entries;
  } catch {
    return null;
  }
}
