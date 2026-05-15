/**
 * Payment gateway webhooks. ALWAYS:
 *   1. Verify the gateway signature using the adapter (constant-time).
 *   2. Confirm the booking exists and is still PENDING_PAYMENT.
 *   3. Mutate state under a transaction with an idempotency key so retries
 *      from the gateway are safe.
 *
 * IMPORTANT: gateways may retry; everything here MUST be idempotent.
 */
import { Booking as CoreBooking, errors } from '@pcn/core';
import { VNPay, MoMo, ZaloPay } from '@pcn/adapters';
import { prisma } from '@pcn/db';
import type { FastifyInstance } from 'fastify';

import { env } from '../env.js';

const vnpayAdapter = () =>
  env.VNPAY_HASH_SECRET && env.VNPAY_TMN_CODE && env.VNPAY_URL
    ? VNPay.createVnpay({
        tmnCode: env.VNPAY_TMN_CODE,
        hashSecret: env.VNPAY_HASH_SECRET,
        payUrl: env.VNPAY_URL,
      })
    : null;

const momoAdapter = () =>
  env.MOMO_ACCESS_KEY && env.MOMO_PARTNER_CODE && env.MOMO_SECRET_KEY && env.MOMO_ENDPOINT
    ? MoMo.createMomo({
        partnerCode: env.MOMO_PARTNER_CODE,
        accessKey: env.MOMO_ACCESS_KEY,
        secretKey: env.MOMO_SECRET_KEY,
        endpoint: env.MOMO_ENDPOINT,
      })
    : null;

const zaloPayAdapter = () =>
  env.ZALOPAY_APP_ID && env.ZALOPAY_KEY1 && env.ZALOPAY_KEY2 && env.ZALOPAY_ENDPOINT
    ? ZaloPay.createZaloPay({
        appId: env.ZALOPAY_APP_ID,
        key1: env.ZALOPAY_KEY1,
        key2: env.ZALOPAY_KEY2,
        endpoint: env.ZALOPAY_ENDPOINT,
      })
    : null;

export const webhookRoutes = async (app: FastifyInstance): Promise<void> => {
  const handleCallback = async (
    raw: Record<string, string | number | boolean | null>,
    verify: (raw: Record<string, string | number | boolean | null>) => ReturnType<typeof VNPay.createVnpay>['verifyCallback'] extends (cb: { raw: typeof raw }) => infer R ? R : never,
  ) => {
    const result = verify(raw);
    if (!result.ok) throw errors.paymentFailed(result.message ?? 'Payment not OK');

    const code = result.bookingId;
    if (!code) throw errors.validation('Missing bookingId in callback');
    const booking = await prisma.booking.findFirst({
      where: { OR: [{ id: code }, { code }] },
    });
    if (!booking) throw errors.notFound('Booking');

    // Idempotency: if booking is already CONFIRMED, no-op.
    if (booking.status === 'CONFIRMED') return { ok: true };

    if (!CoreBooking.canTransition(booking.status, 'PAYMENT_CAPTURED')) {
      throw errors.conflict(`Cannot capture payment in state ${booking.status}`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      });
      await tx.payment.updateMany({
        where: { bookingId: booking.id, status: 'PENDING' },
        data: {
          status: 'CAPTURED',
          gatewayTxnId: result.gatewayTxnId,
          signatureVerifiedAt: new Date(),
          capturedAt: new Date(),
          rawCallback: raw as never,
        },
      });
      await tx.bookingTimeline.create({
        data: { bookingId: booking.id, event: 'PAYMENT_CAPTURED', payload: { txn: result.gatewayTxnId } },
      });
      await tx.outboxEvent.create({
        data: { topic: 'booking.confirmed', payload: { bookingId: booking.id } },
      });
    });
    return { ok: true };
  };

  app.post('/vnpay', async (req) => {
    const adapter = vnpayAdapter();
    if (!adapter) throw errors.validation('VNPay not configured');
    return handleCallback((req.body ?? req.query) as Record<string, string>, (raw) =>
      adapter.verifyCallback({ raw }),
    );
  });

  app.post('/momo', async (req) => {
    const adapter = momoAdapter();
    if (!adapter) throw errors.validation('MoMo not configured');
    return handleCallback(req.body as Record<string, string>, (raw) =>
      adapter.verifyCallback({ raw }),
    );
  });

  app.post('/zalopay', async (req) => {
    const adapter = zaloPayAdapter();
    if (!adapter) throw errors.validation('ZaloPay not configured');
    return handleCallback(req.body as Record<string, string>, (raw) =>
      adapter.verifyCallback({ raw }),
    );
  });

  /**
   * Zalo OA webhook. We verify the HMAC, persist the inbound message, then
   * push an event onto the outbox so the bot worker can compose a reply.
   */
  app.post('/zalo-oa', { config: { rawBody: true } }, async (req) => {
    const raw = JSON.stringify(req.body);
    const mac = String(req.headers['x-zevent-signature'] ?? '');
    if (!env.ZALO_OA_SECRET) throw errors.validation('Zalo OA not configured');
    const { ZaloOa } = await import('@pcn/adapters');
    if (!ZaloOa.verifyWebhookSignature(raw, mac, env.ZALO_OA_SECRET)) {
      throw errors.paymentSignatureInvalid();
    }
    await prisma.outboxEvent.create({
      data: { topic: 'zalo.oa.event', payload: req.body as never },
    });
    return { ok: true };
  });
};
