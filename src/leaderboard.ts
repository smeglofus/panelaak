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

/**
 * Where the API lives. Empty (the default) means a relative /api path — right
 * for the docker-compose deployment, where nginx proxies /api to the backend
 * on the same origin. Builds that have no nginx in front of them (GitHub Pages,
 * and later a desktop .exe, which loads from file:// and has no origin to be
 * relative to) set VITE_API_BASE to the public https URL of the backend at
 * build time. Trailing slashes are trimmed so both forms concatenate cleanly.
 */
const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '');

/** True when this build has no API to talk to and no nginx to proxy one. */
export function apiConfigured(): boolean {
  // A relative path only resolves against an http(s) origin; a desktop build
  // opened from file:// would resolve it against the filesystem and always fail.
  return API_BASE !== '' || window.location.protocol.startsWith('http');
}

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

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

/**
 * Why a submit didn't land. `offline` means we couldn't reach the backend at
 * all; the other two mean it answered and said no — which is a different story
 * for the player, and must not be reported as "the leaderboard is unavailable".
 */
export type SubmitFailure = 'offline' | 'rateLimited' | 'rejected';

export type SubmitResult = { ok: true; rank?: number } | { ok: false; reason: SubmitFailure };

/** Maps an HTTP status the backend answered with onto the player-facing reason. */
export function failureFromStatus(status: number): SubmitFailure {
  if (status === 429) return 'rateLimited'; // POST_COOLDOWN_MS on the server
  if (status >= 400 && status < 500) return 'rejected';
  return 'offline'; // 5xx — the backend is there but broken, same story as down
}

export async function submitScore(input: {
  score: number;
  era: number;
  kupony: number;
}): Promise<SubmitResult> {
  if (!apiConfigured()) return { ok: false, reason: 'offline' };
  try {
    const res = await fetch(apiUrl('/api/score'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ playerId: playerId(), name: playerName(), ...input }),
    });
    if (!res.ok) return { ok: false, reason: failureFromStatus(res.status) };
    const data = (await res.json()) as { rank?: number };
    return { ok: true, rank: data.rank };
  } catch {
    return { ok: false, reason: 'offline' };
  }
}

export async function fetchLeaderboard(limit = 20): Promise<LeaderboardEntry[] | null> {
  if (!apiConfigured()) return null;
  try {
    const res = await fetch(apiUrl(`/api/leaderboard?limit=${limit}`));
    if (!res.ok) return null;
    const data = (await res.json()) as { entries: LeaderboardEntry[] };
    return data.entries;
  } catch {
    return null;
  }
}
