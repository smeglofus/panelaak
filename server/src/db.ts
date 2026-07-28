// SQLite storage for the leaderboard. One row per player, keyed by the
// anonymous playerId the client keeps in localStorage. A player's row holds
// only their best score, so the table stays small and the board is a plain
// ORDER BY score DESC.

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.DB_PATH ?? './data/leaderboard.db';
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    player_id  TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    score      INTEGER NOT NULL,
    era        INTEGER NOT NULL DEFAULT 0,
    kupony     INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
`);

export interface ScoreRow {
  player_id: string;
  name: string;
  score: number;
  era: number;
  kupony: number;
  updated_at: number;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  era: number;
  kupony: number;
}

// score = MAX(old, new): a player only ever climbs, never regresses.
const upsertStmt = db.prepare(`
  INSERT INTO scores (player_id, name, score, era, kupony, updated_at)
  VALUES (@player_id, @name, @score, @era, @kupony, @updated_at)
  ON CONFLICT(player_id) DO UPDATE SET
    name = excluded.name,
    era = excluded.era,
    kupony = excluded.kupony,
    updated_at = excluded.updated_at,
    score = MAX(scores.score, excluded.score)
`);

export function upsertScore(row: ScoreRow): void {
  upsertStmt.run(row);
}

const topStmt = db.prepare(`
  SELECT name, score, era, kupony FROM scores
  ORDER BY score DESC, updated_at ASC
  LIMIT ?
`);

export function topScores(limit: number): LeaderboardEntry[] {
  return topStmt.all(limit) as LeaderboardEntry[];
}

const rankStmt = db.prepare(`SELECT COUNT(*) + 1 AS rank FROM scores WHERE score > ?`);

export function rankForScore(score: number): number {
  return (rankStmt.get(score) as { rank: number }).rank;
}
