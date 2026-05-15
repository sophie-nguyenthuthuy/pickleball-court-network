import { Ladder as CoreLadder, Rating } from '@pcn/core';
import { prisma } from '@pcn/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../auth.js';

export const ladderRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/', {
    schema: {
      querystring: z.object({
        city: z.string().optional(),
        sport: z.enum(['PICKLEBALL', 'PADEL']).optional(),
        status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED']).optional(),
      }),
    },
    handler: async (req) => {
      const q = req.query as { city?: string; sport?: 'PICKLEBALL' | 'PADEL'; status?: string };
      return prisma.ladder.findMany({
        where: { ...q },
        orderBy: { startsOn: 'desc' },
        take: 50,
      });
    },
  });

  app.get('/:slug', {
    schema: { params: z.object({ slug: z.string() }) },
    handler: async (req) => {
      const { slug } = req.params as { slug: string };
      const ladder = await prisma.ladder.findUnique({ where: { slug } });
      if (!ladder) throw app.httpErrors.notFound();
      const standings = await prisma.ladderEntry.findMany({
        where: { ladderId: ladder.id },
        include: { user: { select: { id: true, displayName: true, slug: true, avatarUrl: true } } },
        orderBy: [{ points: 'desc' }, { wins: 'desc' }],
        take: 200,
      });
      return { ladder, standings: CoreLadder.sortLadder(standings.map((s) => ({
        userId: s.userId,
        points: s.points,
        wins: s.wins,
        losses: s.losses,
        draws: 0,
        currentStreak: s.currentStreak,
      }))) };
    },
  });

  /**
   * Submit a match result. Posted by either side; the other side has to
   * confirm before it's CONFIRMED and counted toward ratings.
   */
  app.post('/:ladderId/matches', {
    preHandler: requireAuth,
    schema: {
      params: z.object({ ladderId: z.string().uuid() }),
      body: z.object({
        format: z.enum(['SINGLES', 'DOUBLES', 'MIXED_DOUBLES']),
        playedAt: z.coerce.date(),
        sideAUserIds: z.array(z.string().uuid()).min(1).max(2),
        sideBUserIds: z.array(z.string().uuid()).min(1).max(2),
        sideAScore: z.number().int().min(0).max(99),
        sideBScore: z.number().int().min(0).max(99),
      }),
    },
    handler: async (req) => {
      const { ladderId } = req.params as { ladderId: string };
      const body = req.body as {
        format: 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES';
        playedAt: Date;
        sideAUserIds: string[];
        sideBUserIds: string[];
        sideAScore: number;
        sideBScore: number;
      };
      const ladder = await prisma.ladder.findUnique({ where: { id: ladderId } });
      if (!ladder) throw app.httpErrors.notFound();
      const winnerSide = body.sideAScore === body.sideBScore ? null : body.sideAScore > body.sideBScore ? 'A' : 'B';
      const match = await prisma.match.create({
        data: {
          ladderId,
          sport: ladder.sport,
          format: body.format,
          playedAt: body.playedAt,
          sideAUserIds: body.sideAUserIds,
          sideBUserIds: body.sideBUserIds,
          sideAScore: body.sideAScore,
          sideBScore: body.sideBScore,
          winnerSide,
          recordedById: req.auth!.userId,
        },
      });
      await prisma.outboxEvent.create({
        data: { topic: 'match.submitted', payload: { matchId: match.id } },
      });
      return match;
    },
  });

  /** Ad-hoc: simulate a Glicko update so the client can show "+12 rating gain" UI optimistically. */
  app.post('/_simulate-rating', {
    preHandler: requireAuth,
    schema: {
      body: z.object({
        self: z.object({ rating: z.number(), rd: z.number(), volatility: z.number() }),
        opponent: z.object({ rating: z.number(), rd: z.number(), volatility: z.number() }),
        result: z.enum(['WIN', 'LOSS', 'DRAW']),
      }),
    },
    handler: async (req) => {
      const { self, opponent, result } = req.body as {
        self: Rating.Rating;
        opponent: Rating.Rating;
        result: 'WIN' | 'LOSS' | 'DRAW';
      };
      const score = result === 'WIN' ? 1 : result === 'DRAW' ? 0.5 : 0;
      return Rating.updateRating(self, [{ opponent, score }]);
    },
  });
};
