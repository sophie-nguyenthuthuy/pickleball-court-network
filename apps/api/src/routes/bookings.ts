import { Booking as CoreBooking, errors } from '@pcn/core';
import { prisma } from '@pcn/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../auth.js';

export const bookingRoutes = async (app: FastifyInstance): Promise<void> => {
  /**
   * Create a booking — planning step + DB transaction.
   *
   * The Postgres EXCLUDE constraint on (courtId, tstzrange(startAt,endAt))
   * is our last-mile defence against double-booking under a race; if it
   * fires we convert the error to 409 SLOT_UNAVAILABLE.
   */
  app.post('/', {
    preHandler: requireAuth,
    schema: {
      body: CoreBooking.CreateBookingInput.omit({ organizerId: true }),
    },
    handler: async (req) => {
      const body = req.body as Omit<CoreBooking.CreateBookingInput, 'organizerId'>;
      const input: CoreBooking.CreateBookingInput = { ...body, organizerId: req.auth!.userId };

      // Idempotency: if the same key was used for a booking by this user, return the prior result.
      if (input.idempotencyKey) {
        const prior = await prisma.booking.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });
        if (prior) return prior;
      }

      const dow = new Date(input.startAt).getDay();
      const [rules, existing, exceptions] = await Promise.all([
        prisma.courtScheduleRule.findMany({ where: { courtId: input.courtId, isBookable: true } }),
        prisma.booking.findMany({
          where: {
            courtId: input.courtId,
            status: { in: ['PENDING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS'] },
            startAt: { lt: input.endAt },
            endAt: { gt: input.startAt },
          },
          select: { startAt: true, endAt: true, status: true },
        }),
        prisma.courtScheduleException.findMany({
          where: {
            courtId: input.courtId,
            startAt: { lt: input.endAt },
            endAt: { gt: input.startAt },
          },
        }),
      ]);

      const plan = CoreBooking.planBooking(input, {
        rules: rules.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startMinute: r.startMinute,
          endMinute: r.endMinute,
          basePriceVnd: r.basePriceVnd,
          peakPriceVnd: r.peakPriceVnd,
          peakWindows: (r.peakWindows as Array<{ startMinute: number; endMinute: number }> | null) ?? [],
        })),
        existing: existing.map((e) => ({ startAt: e.startAt, endAt: e.endAt, status: e.status })),
        exceptions: exceptions.map((e) => ({ startAt: e.startAt, endAt: e.endAt, kind: e.kind })),
      });
      void dow;

      try {
        const booking = await prisma.$transaction(async (tx) => {
          const b = await tx.booking.create({
            data: {
              code: plan.code,
              courtId: input.courtId,
              organizerId: input.organizerId,
              startAt: input.startAt,
              endAt: input.endAt,
              priceVnd: plan.priceVnd,
              platformFeeVnd: plan.platformFeeVnd,
              source: input.source,
              notes: input.notes,
              idempotencyKey: input.idempotencyKey,
            },
          });
          await tx.bookingTimeline.create({
            data: { bookingId: b.id, event: 'CREATED', actorId: input.organizerId },
          });
          await tx.outboxEvent.create({
            data: { topic: 'booking.created', payload: { bookingId: b.id } },
          });
          return b;
        });
        return booking;
      } catch (e) {
        if ((e as { code?: string }).code === 'P2010' || /exclusion/i.test(String(e))) {
          throw errors.slotUnavailable();
        }
        throw e;
      }
    },
  });

  app.get('/:id', {
    preHandler: requireAuth,
    schema: { params: z.object({ id: z.string().uuid() }) },
    handler: async (req) => {
      const { id } = req.params as { id: string };
      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          court: { include: { venue: true } },
          participants: true,
          payments: { orderBy: { createdAt: 'desc' } },
          timeline: { orderBy: { at: 'asc' } },
        },
      });
      if (!booking) throw errors.notFound('Booking', id);
      // basic access: organizer or venue owner can view
      if (booking.organizerId !== req.auth!.userId && booking.court.venue.ownerId !== req.auth!.userId) {
        throw errors.forbidden();
      }
      return booking;
    },
  });

  app.post('/:id/cancel', {
    preHandler: requireAuth,
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: z.object({ reason: z.string().max(500).optional() }),
    },
    handler: async (req) => {
      const { id } = req.params as { id: string };
      const { reason } = req.body as { reason?: string };
      const booking = await prisma.booking.findUnique({ where: { id } });
      if (!booking) throw errors.notFound('Booking', id);
      if (booking.organizerId !== req.auth!.userId) throw errors.forbidden();
      if (!CoreBooking.canTransition(booking.status, 'CANCEL')) {
        throw errors.conflict(`Cannot cancel booking in state ${booking.status}`);
      }
      const updated = await prisma.$transaction(async (tx) => {
        const b = await tx.booking.update({
          where: { id },
          data: {
            status: CoreBooking.nextStatus(booking.status, 'CANCEL'),
            cancelledAt: new Date(),
            cancellationReason: reason ?? null,
          },
        });
        await tx.bookingTimeline.create({
          data: { bookingId: id, event: 'CANCELLED', actorId: req.auth!.userId, payload: { reason } },
        });
        await tx.outboxEvent.create({ data: { topic: 'booking.cancelled', payload: { bookingId: id } } });
        return b;
      });
      return updated;
    },
  });
};
