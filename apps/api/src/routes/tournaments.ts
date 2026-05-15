import { Tournament as CoreTournament, errors } from '@pcn/core';
import { prisma } from '@pcn/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireAuth, requireRole } from '../auth.js';

export const tournamentRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/', async () =>
    prisma.tournament.findMany({
      where: { status: { in: ['ANNOUNCED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS'] } },
      orderBy: { startsOn: 'asc' },
      include: { venue: { select: { name: true, slug: true, city: true } }, divisions: true },
      take: 50,
    }),
  );

  app.get('/:slug', {
    schema: { params: z.object({ slug: z.string() }) },
    handler: async (req) => {
      const { slug } = req.params as { slug: string };
      const t = await prisma.tournament.findUnique({
        where: { slug },
        include: {
          divisions: true,
          venue: true,
          registrations: { take: 200, orderBy: { registeredAt: 'asc' } },
        },
      });
      if (!t) throw errors.notFound('Tournament', slug);
      return t;
    },
  });

  app.post('/:tournamentId/register', {
    preHandler: requireAuth,
    schema: {
      params: z.object({ tournamentId: z.string().uuid() }),
      body: z.object({
        divisionId: z.string().uuid(),
        partnerId: z.string().uuid().optional(),
        teamName: z.string().max(120).optional(),
      }),
    },
    handler: async (req) => {
      const { tournamentId } = req.params as { tournamentId: string };
      const body = req.body as { divisionId: string; partnerId?: string; teamName?: string };
      const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
      if (!tournament) throw errors.notFound('Tournament', tournamentId);
      if (tournament.status !== 'REGISTRATION_OPEN') {
        throw errors.conflict('Tournament registration is not open');
      }
      return prisma.tournamentRegistration.create({
        data: {
          tournamentId,
          divisionId: body.divisionId,
          captainId: req.auth!.userId,
          partnerId: body.partnerId,
          teamName: body.teamName,
        },
      });
    },
  });

  /** Generate the bracket for a division. Admin / organiser only. */
  app.post('/:tournamentId/divisions/:divisionId/draw', {
    preHandler: requireRole('ADMIN', 'STAFF', 'COURT_OWNER'),
    schema: {
      params: z.object({
        tournamentId: z.string().uuid(),
        divisionId: z.string().uuid(),
      }),
      body: z.object({
        bracketType: z.enum(['SINGLE_ELIM', 'ROUND_ROBIN']).default('SINGLE_ELIM'),
      }),
    },
    handler: async (req) => {
      const { tournamentId, divisionId } = req.params as { tournamentId: string; divisionId: string };
      const { bracketType } = req.body as { bracketType: 'SINGLE_ELIM' | 'ROUND_ROBIN' };

      const regs = await prisma.tournamentRegistration.findMany({
        where: { tournamentId, divisionId, status: 'CONFIRMED' },
        orderBy: { seed: 'asc' },
      });
      if (regs.length < 2) throw errors.validation('Need at least 2 confirmed registrations');

      const matches =
        bracketType === 'SINGLE_ELIM'
          ? CoreTournament.generateSingleEliminationBracket(
              regs.map((r, i) => ({ registrationId: r.id, seed: r.seed ?? i + 1 })),
            )
          : CoreTournament.generateRoundRobin(regs.map((r) => r.id)).map((p) => ({
              round: p.round,
              matchNumber: p.matchNumber,
              sideARegId: p.sideARegId,
              sideBRegId: p.sideBRegId,
            }));

      await prisma.$transaction(async (tx) => {
        await tx.bracketMatch.deleteMany({ where: { tournamentId, divisionId } });
        for (const m of matches) {
          await tx.bracketMatch.create({
            data: {
              tournamentId,
              divisionId,
              round: m.round,
              matchNumber: m.matchNumber,
              sideARegId: m.sideARegId,
              sideBRegId: m.sideBRegId,
            },
          });
        }
      });
      return { ok: true, matches: matches.length };
    },
  });
};
