// Geometry of the walk home. Lives outside the component because the first
// version judged collisions against numbers that had nothing to do with the
// drawn glyphs — Lojza fell over from a clear step away — and that is exactly
// the kind of thing worth pinning down in a test.

export const LANE_W = 260;
export const LANE_H = 260;
/** Rendered size of the emoji, in px. Both are drawn at font-size 22. */
export const GLYPH = 22;
/** Lojza sits this far above the bottom edge (CSS `bottom`). */
export const LOJZA_BOTTOM = 10;
/**
 * Shrinks the hit box on every side. The drawn emoji doesn't fill its box, and
 * a near miss should read as a near miss — better to let one through than to
 * end the walk on empty pavement.
 */
export const FORGIVENESS = 6;

export interface Obstacle {
  /** Left edge of the glyph. */
  x: number;
  /** Top edge of the glyph. */
  y: number;
}

/**
 * True when Lojza is actually touching the obstacle. `lojzaX` is his centre,
 * which is how the component positions him.
 */
export function hits(lojzaX: number, o: Obstacle): boolean {
  const reach = GLYPH - FORGIVENESS; // centre-to-centre overlap distance
  const dx = Math.abs(o.x + GLYPH / 2 - lojzaX);
  if (dx >= reach) return false;

  const lojzaTop = LANE_H - LOJZA_BOTTOM - GLYPH;
  const lojzaBottom = LANE_H - LOJZA_BOTTOM;
  const obstacleTop = o.y + FORGIVENESS / 2;
  const obstacleBottom = o.y + GLYPH - FORGIVENESS / 2;
  return obstacleBottom > lojzaTop && obstacleTop < lojzaBottom;
}
