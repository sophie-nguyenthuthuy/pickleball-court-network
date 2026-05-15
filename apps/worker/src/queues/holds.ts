/**
 * Sweep expired BookingHold rows (10-minute slot reservations during payment).
 * Also flips PENDING_PAYMENT bookings to EXPIRED if their hold window has
 * elapsed without a payment callback.
 */
import { prisma } from '@pcn/db';
import type { Logger } from '@pcn/observability';

const HOLD_TTL_MS = 10 * 60 * 1000;
const TICK_MS = 30_000;

export const startHoldExpirySweeper = async (logger: Logger): Promise<void> => {
  logger.info('hold expiry sweeper started');
  const tick = async () => {
    try {
      const cutoff = new Date(Date.now() - HOLD_TTL_MS);
      const stale = await prisma.booking.findMany({
        where: { status: 'PENDING_PAYMENT', createdAt: { lt: cutoff } },
        select: { id: true },
        take: 200,
      });
      if (stale.length) {
        await prisma.$transaction(async (tx) => {
          for (const b of stale) {
            await tx.booking.update({ where: { id: b.id }, data: { status: 'EXPIRED' } });
            await tx.bookingTimeline.create({ data: { bookingId: b.id, event: 'EXPIRED' } });
          }
        });
        logger.info({ count: stale.length }, 'bookings expired');
      }
      await prisma.bookingHold.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    } catch (err) {
      logger.error({ err }, 'hold sweeper tick failed');
    }
    setTimeout(tick, TICK_MS);
  };
  void tick();
};
