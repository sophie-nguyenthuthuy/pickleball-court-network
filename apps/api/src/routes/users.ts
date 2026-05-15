import { prisma } from '@pcn/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../auth.js';

export const userRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/', { preHandler: requireAuth }, async (req) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.auth!.userId },
      select: {
        id: true,
        phone: true,
        displayName: true,
        slug: true,
        avatarUrl: true,
        city: true,
        district: true,
        preferredSport: true,
        roles: true,
        createdAt: true,
      },
    });
    return user;
  });

  app.patch('/', {
    preHandler: requireAuth,
    schema: {
      body: z.object({
        displayName: z.string().min(1).max(120).optional(),
        city: z.string().max(120).optional(),
        district: z.string().max(120).optional(),
        avatarUrl: z.string().url().optional(),
        preferredSport: z.enum(['PICKLEBALL', 'PADEL']).optional(),
      }),
    },
    handler: async (req) => {
      const data = req.body as Record<string, unknown>;
      const updated = await prisma.user.update({
        where: { id: req.auth!.userId },
        data,
        select: { id: true, displayName: true, city: true, district: true, preferredSport: true, avatarUrl: true },
      });
      return updated;
    },
  });

  app.get('/bookings', { preHandler: requireAuth }, async (req) => {
    const items = await prisma.booking.findMany({
      where: { organizerId: req.auth!.userId },
      orderBy: { startAt: 'desc' },
      take: 50,
      include: {
        court: { include: { venue: { select: { name: true, slug: true, city: true } } } },
      },
    });
    return { items };
  });
};
