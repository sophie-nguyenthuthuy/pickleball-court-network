import { describe, expect, it } from 'vitest';

import { generateRoundRobin, generateSingleEliminationBracket } from './bracket.js';

describe('generateSingleEliminationBracket', () => {
  it('pairs seeds 1v8, 4v5, 2v7, 3v6 for an 8-team field', () => {
    const entries = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({
      registrationId: `r${seed}`,
      seed,
    }));
    const matches = generateSingleEliminationBracket(entries);
    const round1 = matches.filter((m) => m.round === 1);
    expect(round1).toHaveLength(4);
    expect(round1[0]).toMatchObject({ sideARegId: 'r1', sideBRegId: 'r8' });
    expect(round1[1]).toMatchObject({ sideARegId: 'r4', sideBRegId: 'r5' });
    expect(round1[2]).toMatchObject({ sideARegId: 'r2', sideBRegId: 'r7' });
    expect(round1[3]).toMatchObject({ sideARegId: 'r3', sideBRegId: 'r6' });
  });

  it('pads with byes for non-power-of-two fields', () => {
    const entries = [1, 2, 3, 4, 5].map((seed) => ({ registrationId: `r${seed}`, seed }));
    const matches = generateSingleEliminationBracket(entries);
    const round1 = matches.filter((m) => m.round === 1);
    expect(round1).toHaveLength(4);
    const byeMatches = round1.filter((m) => m.sideARegId === null || m.sideBRegId === null);
    expect(byeMatches.length).toBeGreaterThan(0);
  });
});

describe('generateRoundRobin', () => {
  it('produces N-1 rounds for even N with every pair playing once', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const pairings = generateRoundRobin(ids);
    expect(new Set(pairings.map((p) => p.round)).size).toBe(3);
    const seen = new Set<string>();
    for (const p of pairings) {
      const key = [p.sideARegId, p.sideBRegId].sort().join('|');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('handles odd N with a bye', () => {
    const ids = ['a', 'b', 'c'];
    const pairings = generateRoundRobin(ids);
    expect(pairings.length).toBe(3);
  });
});
