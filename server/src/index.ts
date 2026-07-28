// Panelák Tycoon leaderboard API. Deliberately tiny: submit your best score,
// read the top N. The client computes the score, so this is a vanity board —
// validation here is sanity + light rate-limiting, not anti-cheat (see issue #5).

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { upsertScore, topScores, rankForScore } from './db';

const PORT = Number(process.env.PORT ?? 3001);
const NAME_MAX = 24;
const SCORE_MAX = 1e15; // absurd ceiling; anything above is a bad payload
const POST_COOLDOWN_MS = 5000;

const app = Fastify({ logger: true });

// The board is served cross-origin to builds that aren't behind our nginx:
// GitHub Pages (https://…github.io) and desktop builds (origin `file://`,
// `null` or `app://`). No cookies or auth are involved, so a wildcard is the
// honest default; set CORS_ORIGIN to a comma-separated allowlist to narrow it.
const corsEnv = process.env.CORS_ORIGIN?.trim();
await app.register(cors, {
  origin: !corsEnv || corsEnv === '*' ? true : corsEnv.split(',').map((o) => o.trim()),
  methods: ['GET', 'POST'],
});

// Per-player submit cooldown (in-memory; fine for a single small instance).
const lastPost = new Map<string, number>();

app.get('/api/health', async () => ({ ok: true }));

app.get('/api/leaderboard', async (req) => {
  const q = req.query as { limit?: string };
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 50));
  return { entries: topScores(limit) };
});

app.post('/api/score', async (req, reply) => {
  const b = (req.body ?? {}) as Record<string, unknown>;

  const playerId = typeof b.playerId === 'string' ? b.playerId : '';
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(playerId)) {
    return reply.code(400).send({ error: 'bad playerId' });
  }

  const score = Number(b.score);
  if (!Number.isFinite(score) || score < 0 || score > SCORE_MAX) {
    return reply.code(400).send({ error: 'bad score' });
  }

  const now = Date.now();
  if (now - (lastPost.get(playerId) ?? 0) < POST_COOLDOWN_MS) {
    return reply.code(429).send({ error: 'slow down' });
  }
  lastPost.set(playerId, now);

  const rawName = typeof b.name === 'string' ? b.name.trim() : '';
  const name = (rawName || 'Anonymní správce').slice(0, NAME_MAX);
  const era = Number.isFinite(Number(b.era)) ? Math.max(0, Math.floor(Number(b.era))) : 0;
  const kupony = Number.isFinite(Number(b.kupony)) ? Math.max(0, Math.floor(Number(b.kupony))) : 0;
  const flooredScore = Math.floor(score);

  upsertScore({ player_id: playerId, name, score: flooredScore, era, kupony, updated_at: now });
  return { ok: true, rank: rankForScore(flooredScore) };
});

app
  .listen({ port: PORT, host: '0.0.0.0' })
  .then(() => app.log.info(`leaderboard listening on :${PORT}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
