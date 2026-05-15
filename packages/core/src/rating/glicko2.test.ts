import { describe, expect, it } from 'vitest';

import { DEFAULT_RATING, skillBand, updateRating } from './glicko2.js';

describe('Glicko-2 updateRating', () => {
  it('inflates RD when the player is inactive in a period', () => {
    const after = updateRating(DEFAULT_RATING, []);
    expect(after.rd).toBeGreaterThan(DEFAULT_RATING.rd - 1e-6);
    expect(after.rating).toBeCloseTo(DEFAULT_RATING.rating, 5);
  });

  it('rating moves up after a win over a similar opponent', () => {
    const after = updateRating(DEFAULT_RATING, [
      { opponent: { rating: 1500, rd: 200, volatility: 0.06 }, score: 1 },
    ]);
    expect(after.rating).toBeGreaterThan(1500);
    expect(after.rd).toBeLessThan(350);
  });

  it('rating moves down after a loss', () => {
    const after = updateRating(DEFAULT_RATING, [
      { opponent: { rating: 1500, rd: 200, volatility: 0.06 }, score: 0 },
    ]);
    expect(after.rating).toBeLessThan(1500);
  });
});

describe('skillBand', () => {
  it('maps default rating to roughly DUPR 3.5', () => {
    expect(skillBand(1500)).toBeCloseTo(3.5, 1);
  });
  it('clamps to 2.0 floor', () => {
    expect(skillBand(800)).toBe(2.0);
  });
  it('clamps to 7.0 ceiling', () => {
    expect(skillBand(2500)).toBe(7.0);
  });
});
