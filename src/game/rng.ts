// Mulberry32 — tiny seedable PRNG. The whole game draws randomness from a
// single advancing seed stored in GameState, so tick() is deterministic and
// reproducible in tests.

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  chance(p: number): boolean;
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** Current internal seed — store it back into GameState after a tick. */
  state(): number;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    chance: (p) => next() < p,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    state: () => a,
  };
}
