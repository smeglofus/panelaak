// Toast stack fed by the game log. Entries that existed before mount (loaded
// save) are skipped; new ones appear and expire after a few seconds.

import { useEffect, useRef, useState } from 'react';
import type { LogEntry } from '../game/types';
import { play, type SoundId } from '../sound';

const TOAST_MS = 7000;
const MAX_VISIBLE = 4;

interface VisibleToast {
  entry: LogEntry;
  expiresAt: number;
}

export default function EventToast({ log }: { log: LogEntry[] }) {
  const [toasts, setToasts] = useState<VisibleToast[]>([]);
  const lastSeen = useRef<number | null>(null);

  useEffect(() => {
    const latest = log.length > 0 ? log[log.length - 1].seq : 0;
    if (lastSeen.current === null) {
      lastSeen.current = latest; // don't replay the backlog of a loaded save
      return;
    }
    const seen = lastSeen.current;
    const fresh = log.filter((e) => e.seq > seen);
    if (fresh.length === 0) return;
    lastSeen.current = latest;
    // One sound per batch — the most important entry wins.
    const kinds = fresh.map((e) => e.kind);
    const soundKind: SoundId = kinds.includes('milestone')
      ? 'milestone'
      : kinds.includes('bad')
        ? 'bad'
        : kinds.includes('good')
          ? 'good'
          : kinds.includes('event')
            ? 'event'
            : 'info';
    play(soundKind);
    const now = Date.now();
    setToasts((cur) =>
      [...cur, ...fresh.map((entry) => ({ entry, expiresAt: now + TOAST_MS }))].slice(
        -MAX_VISIBLE,
      ),
    );
  }, [log]);

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setToasts((cur) => (cur.some((t) => t.expiresAt <= now) ? cur.filter((t) => t.expiresAt > now) : cur));
    }, 500);
    return () => clearInterval(id);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toasts">
      {toasts.map(({ entry }) => (
        <div
          key={entry.seq}
          className={`toast toast-${entry.kind}`}
          onClick={() => setToasts((cur) => cur.filter((t) => t.entry.seq !== entry.seq))}
        >
          {entry.text}
        </div>
      ))}
    </div>
  );
}
