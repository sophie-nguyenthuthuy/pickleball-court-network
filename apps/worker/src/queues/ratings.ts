/**
 * Glicko-2 rating recompute. Runs once per rating period (default: weekly).
 * For each sport/format, collects CONFIRMED matches in the period and updates
 * every active player's rating row.
 */
import { Rating } from '@pcn/core';
import { prisma } from '@pcn/db';
import type { Logger } from '@pcn/observability';

const PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

export const startRatingsRecomputer = async (logger: Logger): Promise<void> => {
  logger.info('rating recomputer started');

  const tick = async () => {
    try {
      const periodEnd = new Date();
      const periodStart = new Date(periodEnd.getTime() - PERIOD_MS);
      const matches = await prisma.match.findMany({
        where: { status: 'CONFIRMED', playedAt: { gte: periodStart, lt: periodEnd } },
      });
      if (matches.length === 0) return;

      // Bucket: per (user, sport, format) → list of outcomes
      const byKey = new Map<string, Array<{ opponentRating: Rating.Rating; score: number; userId: string; sport: string; format: string }>>();
      for (const m of matches) {
        for (const side of (['A', 'B'] as const)) {
          const selves = side === 'A' ? m.sideAUserIds : m.sideBUserIds;
          const others = side === 'A' ? m.sideBUserIds : m.sideAUserIds;
          const won = m.winnerSide === side;
          const score = m.winnerSide == null ? 0.5 : won ? 1 : 0;
          for (const userId of selves) {
            const opponentRatings = await prisma.playerRating.findMany({
              where: { userId: { in: others }, sport: m.sport, format: m.format },
            });
            const avg: Rating.Rating =
              opponentRatings.length > 0
                ? {
                    rating: opponentRatings.reduce((s, o) => s + o.rating, 0) / opponentRatings.length,
                    rd: opponentRatings.reduce((s, o) => s + o.deviation, 0) / opponentRatings.length,
                    volatility:
                      opponentRatings.reduce((s, o) => s + o.volatility, 0) / opponentRatings.length,
                  }
                : Rating.DEFAULT_RATING;
            const k = `${userId}|${m.sport}|${m.format}`;
            const list = byKey.get(k) ?? [];
            list.push({ opponentRating: avg, score, userId, sport: m.sport, format: m.format });
            byKey.set(k, list);
          }
        }
      }
      for (const [, outcomes] of byKey) {
        const first = outcomes[0]!;
        const existing = await prisma.playerRating.findUnique({
          where: {
            userId_sport_format: { userId: first.userId, sport: first.sport as 'PICKLEBALL', format: first.format as 'SINGLES' },
          },
        });
        const current: Rating.Rating = existing
          ? { rating: existing.rating, rd: existing.deviation, volatility: existing.volatility }
          : Rating.DEFAULT_RATING;
        const updated = Rating.updateRating(
          current,
          outcomes.map((o) => ({ opponent: o.opponentRating, score: o.score })),
        );
        await prisma.playerRating.upsert({
          where: {
            userId_sport_format: { userId: first.userId, sport: first.sport as 'PICKLEBALL', format: first.format as 'SINGLES' },
          },
          create: {
            userId: first.userId,
            sport: first.sport as 'PICKLEBALL',
            format: first.format as 'SINGLES',
            rating: updated.rating,
            deviation: updated.rd,
            volatility: updated.volatility,
            matchesPlayed: outcomes.length,
            wins: outcomes.filter((o) => o.score === 1).length,
            losses: outcomes.filter((o) => o.score === 0).length,
            lastMatchAt: periodEnd,
          },
          update: {
            rating: updated.rating,
            deviation: updated.rd,
            volatility: updated.volatility,
            matchesPlayed: (existing?.matchesPlayed ?? 0) + outcomes.length,
            wins: (existing?.wins ?? 0) + outcomes.filter((o) => o.score === 1).length,
            losses: (existing?.losses ?? 0) + outcomes.filter((o) => o.score === 0).length,
            lastMatchAt: periodEnd,
          },
        });
      }
      logger.info({ matches: matches.length, players: byKey.size }, 'rating recompute done');
    } catch (err) {
      logger.error({ err }, 'rating recompute failed');
    }
    setTimeout(tick, PERIOD_MS);
  };
  // first run on boot for any pending matches; afterwards every period
  void tick();
};
