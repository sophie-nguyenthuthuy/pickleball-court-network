import { errors } from '../errors.js';

export interface SeededEntry {
  registrationId: string;
  seed: number;
}

export interface DraftMatch {
  round: number;
  matchNumber: number;
  sideARegId: string | null;
  sideBRegId: string | null;
}

const nextPowerOfTwo = (n: number): number => 1 << Math.ceil(Math.log2(n));

/**
 * Generate the single-elimination bracket "1 vs N, 2 vs N-1, ..." with
 * byes for the top seeds. Returns the round-1 pairings; subsequent rounds
 * are TBD-placeholders that the engine fills as winners advance.
 */
export const generateSingleEliminationBracket = (entries: SeededEntry[]): DraftMatch[] => {
  if (entries.length < 2) throw errors.validation('Need at least 2 entries');
  const sorted = [...entries].sort((a, b) => a.seed - b.seed);
  const size = nextPowerOfTwo(sorted.length);
  const padded: (SeededEntry | null)[] = [...sorted];
  while (padded.length < size) padded.push(null);

  const matches: DraftMatch[] = [];
  // standard bracket pattern via permutation
  const order = buildSeedOrder(size);
  for (let i = 0; i < order.length; i += 2) {
    const aIdx = order[i]! - 1;
    const bIdx = order[i + 1]! - 1;
    matches.push({
      round: 1,
      matchNumber: i / 2 + 1,
      sideARegId: padded[aIdx]?.registrationId ?? null,
      sideBRegId: padded[bIdx]?.registrationId ?? null,
    });
  }

  // empty placeholders for later rounds
  let prevRoundSize = size / 2;
  let round = 2;
  while (prevRoundSize > 1) {
    for (let i = 0; i < prevRoundSize / 2; i++) {
      matches.push({ round, matchNumber: i + 1, sideARegId: null, sideBRegId: null });
    }
    prevRoundSize /= 2;
    round++;
  }
  return matches;
};

/**
 * Standard seed-placement so 1 plays 16, 8 plays 9, etc., interleaved correctly.
 *   size=2 → [1,2]; size=4 → [1,4,2,3]; size=8 → [1,8,4,5,2,7,3,6]; …
 */
const buildSeedOrder = (size: number): number[] => {
  let order = [1, 2];
  let curSize = 2;
  while (curSize < size) {
    const next: number[] = [];
    const newSize = curSize * 2;
    for (const seed of order) {
      next.push(seed);
      next.push(newSize + 1 - seed);
    }
    order = next;
    curSize = newSize;
  }
  return order;
};

export interface RoundRobinPairing {
  round: number;
  matchNumber: number;
  sideARegId: string;
  sideBRegId: string;
}

/**
 * Round-robin scheduler (Berger tables). Produces N-1 rounds for an even N.
 * If N is odd we add a "bye" sentinel; matches against it are filtered out.
 */
export const generateRoundRobin = (regIds: string[]): RoundRobinPairing[] => {
  if (regIds.length < 2) throw errors.validation('Need at least 2 entries');
  const ids = [...regIds];
  if (ids.length % 2 === 1) ids.push('__bye__');
  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const pairings: RoundRobinPairing[] = [];
  // fix first element, rotate the rest
  let rotation = ids.slice(1);
  for (let r = 0; r < rounds; r++) {
    const fixed = ids[0]!;
    const lineup = [fixed, ...rotation];
    let matchNum = 1;
    for (let i = 0; i < half; i++) {
      const a = lineup[i]!;
      const b = lineup[n - 1 - i]!;
      if (a !== '__bye__' && b !== '__bye__') {
        pairings.push({ round: r + 1, matchNumber: matchNum++, sideARegId: a, sideBRegId: b });
      }
    }
    rotation = [rotation[rotation.length - 1]!, ...rotation.slice(0, -1)];
  }
  return pairings;
};
