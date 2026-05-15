import { prisma } from '@pcn/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export const venueRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/', {
    schema: {
      querystring: z.object({
        city: z.string().optional(),
        district: z.string().optional(),
        sport: z.enum(['PICKLEBALL', 'PADEL']).optional(),
        q: z.string().optional(),
        near_lat: z.coerce.number().optional(),
        near_lng: z.coerce.number().optional(),
        radius_km: z.coerce.number().min(0.5).max(50).default(10),
        page: z.coerce.number().int().positive().default(1),
        per_page: z.coerce.number().int().positive().max(50).default(20),
      }),
    },
    handler: async (req) => {
      const q = req.query as {
        city?: string;
        district?: string;
        sport?: 'PICKLEBALL' | 'PADEL';
        q?: string;
        near_lat?: number;
        near_lng?: number;
        radius_km: number;
        page: number;
        per_page: number;
      };

      if (q.near_lat != null && q.near_lng != null) {
        const rows = await prisma.$queryRawUnsafe<
          Array<{
            id: string;
            slug: string;
            name: string;
            city: string;
            district: string;
            sports: string[];
            review_avg: number | null;
            distance_km: number;
          }>
        >(
          `SELECT id, slug, name, city, district, sports, "reviewAvg" as review_avg,
             ST_Distance(geog, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) / 1000.0 AS distance_km
           FROM "Venue"
           WHERE status = 'ACTIVE'
             AND ST_DWithin(geog, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3 * 1000)
             ${q.sport ? `AND $4 = ANY(sports)` : ''}
           ORDER BY distance_km ASC
           LIMIT $5 OFFSET $6`,
          q.near_lng,
          q.near_lat,
          q.radius_km,
          ...(q.sport ? [q.sport, q.per_page, (q.page - 1) * q.per_page] : [q.per_page, (q.page - 1) * q.per_page]),
        );
        return { items: rows, page: q.page };
      }

      const where: Record<string, unknown> = { status: 'ACTIVE' };
      if (q.city) where.city = q.city;
      if (q.district) where.district = q.district;
      if (q.sport) where.sports = { has: q.sport };
      if (q.q) where.name = { contains: q.q, mode: 'insensitive' };

      const [items, total] = await Promise.all([
        prisma.venue.findMany({
          where,
          orderBy: { reviewAvg: 'desc' },
          skip: (q.page - 1) * q.per_page,
          take: q.per_page,
          select: {
            id: true,
            slug: true,
            name: true,
            city: true,
            district: true,
            sports: true,
            reviewAvg: true,
            reviewCount: true,
            images: true,
          },
        }),
        prisma.venue.count({ where }),
      ]);
      return { items, total, page: q.page };
    },
  });

  app.get('/:slug', {
    schema: { params: z.object({ slug: z.string() }) },
    handler: async (req) => {
      const { slug } = req.params as { slug: string };
      const venue = await prisma.venue.findUnique({
        where: { slug },
        include: {
          courts: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
          reviews: { where: { status: 'PUBLISHED' }, orderBy: { createdAt: 'desc' }, take: 20 },
        },
      });
      if (!venue) throw app.httpErrors.notFound('Venue not found');
      return venue;
    },
  });
};
