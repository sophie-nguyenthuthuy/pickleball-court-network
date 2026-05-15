/**
 * Schedules T-24h and T-2h reminders for every confirmed booking.
 * Driven by a Redis sorted set; cheap and idempotent.
 */
import { prisma } from '@pcn/db';
import type { Logger } from '@pcn/observability';
import { Queue, Worker } from 'bullmq';

import { redisOptions } from '../redis.js';

const queue = new Queue('pcn:reminders', redisOptions);

const REMINDER_OFFSETS_MS = [24 * 60 * 60 * 1000, 2 * 60 * 60 * 1000];

export const startReminderScheduler = async (logger: Logger): Promise<void> => {
  logger.info('reminder scheduler started');

  // Worker that runs at the scheduled time and emits a notification event.
  new Worker(
    'pcn:reminders',
    async (job) => {
      const { bookingId, offsetMs } = job.data as { bookingId: string; offsetMs: number };
      const b = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!b || b.status !== 'CONFIRMED') return; // booking changed; skip
      await prisma.notification.create({
        data: {
          userId: b.organizerId,
          channel: 'ZALO_OA_MSG',
          template: offsetMs === REMINDER_OFFSETS_MS[0] ? 'booking.reminder_24h' : 'booking.reminder_2h',
          payload: { bookingCode: b.code, startAt: b.startAt.toISOString() },
        },
      });
    },
    redisOptions,
  );

  // Polling loop: scan confirmed bookings in next 48h and ensure each has reminder jobs.
  const tick = async () => {
    try {
      const now = new Date();
      const horizon = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const upcoming = await prisma.booking.findMany({
        where: { status: 'CONFIRMED', startAt: { gte: now, lte: horizon } },
        select: { id: true, startAt: true },
      });
      for (const b of upcoming) {
        for (const offsetMs of REMINDER_OFFSETS_MS) {
          const delay = b.startAt.getTime() - offsetMs - now.getTime();
          if (delay <= 0) continue;
          await queue.add(
            'reminder',
            { bookingId: b.id, offsetMs },
            { jobId: `reminder:${b.id}:${offsetMs}`, delay, removeOnComplete: 100 },
          );
        }
      }
    } catch (err) {
      logger.error({ err }, 'reminder tick failed');
    }
    setTimeout(tick, 60_000);
  };
  void tick();
};
