/**
 * Ladder scoring is intentionally simple — Glicko handles the truth, the ladder
 * is the leaderboard view. We award:
 *   win:   +3 base, +bonus for beating a higher-rated opponent
 *   draw:  +1
 *   loss:   0  (but a "respectable loss" against a much stronger player can grant +1)
 */

export interface LadderScoringInput {
  selfRating: number;
  opponentRating: number;
  result: 'WIN' | 'DRAW' | 'LOSS';
}

export const scoreLadderMatch = ({
  selfRating,
  opponentRating,
  result,
}: LadderScoringInput): number => {
  const ratingGap = opponentRating - selfRating;
  switch (result) {
    case 'WIN': {
      const upsetBonus = Math.max(0, Math.round(ratingGap / 75));
      return 3 + upsetBonus;
    }
    case 'DRAW':
      return 1;
    case 'LOSS':
      // 0 unless opponent was ≥150 above you — then a respectable loss
      return ratingGap >= 150 ? 1 : 0;
  }
};

export interface LadderLine {
  userId: string;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
}

export const sortLadder = (rows: LadderLine[]): LadderLine[] =>
  [...rows].sort((a, b) => b.points - a.points || b.wins - a.wins || a.losses - b.losses);
