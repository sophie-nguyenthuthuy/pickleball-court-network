import { errors, Time } from '@pcn/core';
import { prisma } from '@pcn/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const { dayOfWeek, enumerateSlots, isOverlap } = Time;

export const courtRoutes = async (app: FastifyInstance): Promise<void> => {
  /**
   * Get the day's slot grid for one court. Returns 30-minute cells with
   * price + availability — what the booking UI renders directly.
   */
  app.get('/:courtId/slots', {
    schema: {
      params: z.object({ courtId: z.string().uuid() }),
      querystring: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
    },
    handler: async (req) => {
      const { courtId } = req.params as { courtId: string };
      const { date } = req.query as { date: string };
      const dayStart = new Date(`${date}T00:00:00+07:00`);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const court = await prisma.court.findUnique({ where: { id: courtId } });
      if (!court) throw errors.notFound('Court', courtId);

      const dow = dayOfWeek(dayStart);
      const [rules, exceptions, bookings] = await Promise.all([
        prisma.courtScheduleRule.findMany({ where: { courtId, dayOfWeek: dow, isBookable: true } }),
        prisma.courtScheduleException.findMany({
          where: { courtId, startAt: { lt: dayEnd }, endAt: { gt: dayStart } },
        }),
        prisma.booking.findMany({
          where: {
            courtId,
            status: { in: ['PENDING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS'] },
            startAt: { lt: dayEnd },
            endAt: { gt: dayStart },
          },
          select: { startAt: true, endAt: true },
        }),
      ]);

      type Slot = { start: string; end: string; priceVnd: string; isPeak: boolean; available: boolean };
      const slots: Slot[] = [];
      for (const rule of rules) {
        const ranges = enumerateSlots(dayStart, rule.startMinute, rule.endMinute);
        for (const r of ranges) {
          const startMinute = r.start.getHours() * 60 + r.start.getMinutes();
          const peak = (rule.peakWindows as Array<{ startMinute: number; endMinute: number }> | null)?.some(
            (w) => startMinute >= w.startMinute && startMinute < w.endMinute,
          );
          const ratePerHour = peak && rule.peakPriceVnd ? rule.peakPriceVnd : rule.basePriceVnd;
          const priceVnd = (ratePerHour * 30n) / 60n;
          const blocked =
            exceptions.some(
              (e) => e.kind !== 'SPECIAL_PRICE' && isOverlap(r, { start: e.startAt, end: e.endAt }),
            ) || bookings.some((b) => isOverlap(r, { start: b.startAt, end: b.endAt }));
          slots.push({
            start: r.start.toISOString(),
            end: r.end.toISOString(),
            priceVnd: priceVnd.toString(),
            isPeak: !!peak,
            available: !blocked,
          });
        }
      }
      return { date, courtId, slots };
    },
  });
};
