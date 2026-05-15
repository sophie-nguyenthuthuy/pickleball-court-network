/**
 * Glicko-2 rating system (Mark Glickman, 2012).
 *
 * Chosen over plain ELO because:
 *   1. it models rating uncertainty (RD) — important when amateurs play
 *      sporadically; the system rates new players conservatively.
 *   2. it handles inactivity by inflating RD over time, so a player returning
 *      after months won't crush newcomers.
 *
 * Reference: http://www.glicko.net/glicko/glicko2.pdf
 *
 * Conventions:
 *   - mu, phi: in glicko-2 internal units (mu = (rating - 1500) / 173.7178).
 *   - rating, rd: in the user-facing scale (start at 1500, RD 350).
 *   - sigma (volatility) starts at 0.06.
 *
 * For doubles, we treat each player as having faced an opponent with the
 * average of the opposing pair's mu/phi. This is the standard "team
 * decomposition" hack used by USTA-style systems; full team Glicko is more
 * faithful but materially more complex.
 */

export interface Rating {
  rating: number;
  rd: number;
  volatility: number;
}

export const DEFAULT_RATING: Rating = { rating: 1500, rd: 350, volatility: 0.06 };

const SCALE = 173.7178;
const TAU = 0.5;
const EPS = 1e-6;

const toMu = (r: Rating) => (r.rating - 1500) / SCALE;
const toPhi = (r: Rating) => r.rd / SCALE;
const fromMuPhi = (mu: number, phi: number, sigma: number): Rating => ({
  rating: SCALE * mu + 1500,
  rd: SCALE * phi,
  volatility: sigma,
});

const g = (phi: number): number => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
const E = (mu: number, muJ: number, phiJ: number): number => 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));

export interface MatchOutcome {
  opponent: Rating;
  score: number; // 1 win, 0 loss, 0.5 draw
}

const newVolatility = (sigma: number, phi: number, v: number, delta: number): number => {
  const a = Math.log(sigma * sigma);
  const f = (x: number): number => {
    const ex = Math.exp(x);
    const num = ex * (delta * delta - phi * phi - v - ex);
    const den = 2 * (phi * phi + v + ex) ** 2;
    return num / den - (x - a) / (TAU * TAU);
  };
  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }
  let fA = f(A);
  let fB = f(B);
  while (Math.abs(B - A) > EPS) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
  }
  return Math.exp(A / 2);
};

/**
 * Update a player's rating against a batch of match outcomes from a single
 * rating period. Stateless; the caller is responsible for persistence.
 */
export const updateRating = (player: Rating, matches: MatchOutcome[]): Rating => {
  if (matches.length === 0) {
    // Inactivity: inflate phi only.
    const phi = toPhi(player);
    const phiPrime = Math.sqrt(phi * phi + player.volatility * player.volatility);
    return fromMuPhi(toMu(player), phiPrime, player.volatility);
  }
  const mu = toMu(player);
  const phi = toPhi(player);
  let vInv = 0;
  let deltaSum = 0;
  for (const m of matches) {
    const muJ = toMu(m.opponent);
    const phiJ = toPhi(m.opponent);
    const gJ = g(phiJ);
    const eJ = E(mu, muJ, phiJ);
    vInv += gJ * gJ * eJ * (1 - eJ);
    deltaSum += gJ * (m.score - eJ);
  }
  const v = 1 / vInv;
  const delta = v * deltaSum;
  const sigmaPrime = newVolatility(player.volatility, phi, v, delta);
  const phiStar = Math.sqrt(phi * phi + sigmaPrime * sigmaPrime);
  const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const muPrime = mu + phiPrime * phiPrime * deltaSum;
  return fromMuPhi(muPrime, phiPrime, sigmaPrime);
};

/**
 * Map a Glicko rating to a coarse "skill band" mirrored from the DUPR
 * 2.0-7.0 scale that Vietnamese pickleball players are starting to use.
 */
export const skillBand = (rating: number): number => {
  // Linear-ish mapping: 1200 → 2.0, 1500 → 3.5, 1800 → 5.0, 2100 → 6.5
  const band = 2 + ((rating - 1200) / 200) * 1;
  return Math.max(2.0, Math.min(7.0, Number(band.toFixed(2))));
};
