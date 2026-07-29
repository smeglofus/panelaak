// The first version judged collisions against numbers unrelated to the drawn
// glyphs, so Lojza fell over from a clear step away. These pin the hit box to
// what the player actually sees.

import { describe, expect, it } from 'vitest';
import { GLYPH, hits, LANE_H, LOJZA_BOTTOM, type Obstacle } from '../filozof';

/** An obstacle drawn level with Lojza, centred on the given x. */
function levelWith(centerX: number): Obstacle {
  return { x: centerX - GLYPH / 2, y: LANE_H - LOJZA_BOTTOM - GLYPH };
}

describe('hits', () => {
  it('registers a head-on collision', () => {
    expect(hits(130, levelWith(130))).toBe(true);
  });

  it('lets a near miss pass', () => {
    // A clear glyph-width to the side is not a collision.
    expect(hits(130, levelWith(130 + GLYPH))).toBe(false);
    expect(hits(130, levelWith(130 - GLYPH))).toBe(false);
  });

  it('ignores obstacles that are still up the pavement', () => {
    expect(hits(130, { x: 130 - GLYPH / 2, y: 0 })).toBe(false);
    expect(hits(130, { x: 130 - GLYPH / 2, y: 100 })).toBe(false);
  });

  it('does not fall over an obstacle still a step ahead (the reported bug)', () => {
    // The old hit box spanned 60 px vertically for a 22 px glyph, so a bench
    // this far up the pavement ended the walk without ever being touched.
    const stepAhead = { x: 130 - GLYPH / 2, y: LANE_H - LOJZA_BOTTOM - GLYPH - 25 };
    expect(hits(130, stepAhead)).toBe(false);
  });

  it('ignores obstacles already left behind', () => {
    expect(hits(130, { x: 130 - GLYPH / 2, y: LANE_H + 10 })).toBe(false);
  });

  it('is forgiving at the edges rather than harsh', () => {
    // Just touching at the very rim should read as a miss, not a fall.
    const grazing = levelWith(130 + GLYPH - 3);
    expect(hits(130, grazing)).toBe(false);
  });

  it('still catches a real overlap that is off-centre', () => {
    expect(hits(130, levelWith(130 + 8))).toBe(true);
  });
});
