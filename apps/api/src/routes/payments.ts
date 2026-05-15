import { errors, idempotencyKey } from '@pcn/core';
import { VNPay, MoMo, ZaloPay } from '@pcn/adapters';
import { prisma } from '@pcn/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../auth.js';
import { env } from '../env.js';

const buildVnpay = () => {
  if (!env.VNPAY_TMN_CODE || !env.VNPAY_HASH_SECRET || !env.VNPAY_URL) {
    throw errors.validation('VNPay not configured');
  }
  return VNPay.createVnpay({
    tmnCode: env.VNPAY_TMN_CODE,
    hashSecret: env.VNPAY_HASH_SECRET,
    payUrl: env.VNPAY_URL,
  });
};

const buildMomo = () => {
  if (!env.MOMO_PARTNER_CODE || !env.MOMO_ACCESS_KEY || !env.MOMO_SECRET_KEY || !env.MOMO_ENDPOINT) {
    throw errors.validation('MoMo not configured');
  }
  return MoMo.createMomo({
    partnerCode: env.MOMO_PARTNER_CODE,
    accessKey: env.MOMO_ACCESS_KEY,
    secretKey: env.MOMO_SECRET_KEY,
    endpoint: env.MOMO_ENDPOINT,
  });
};

const buildZaloPay = () => {
  if (!env.ZALOPAY_APP_ID || !env.ZALOPAY_KEY1 || !env.ZALOPAY_KEY2 || !env.ZALOPAY_ENDPOINT) {
    throw errors.validation('ZaloPay not configured');
  }
  return ZaloPay.createZaloPay({
    appId: env.ZALOPAY_APP_ID,
    key1: env.ZALOPAY_KEY1,
    key2: env.ZALOPAY_KEY2,
    endpoint: env.ZALOPAY_ENDPOINT,
  });
};

export const paymentRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post('/init', {
    preHandler: requireAuth,
    schema: {
      body: z.object({
        bookingId: z.string().uuid(),
        gateway: z.enum(['VNPAY', 'MOMO', 'ZALOPAY']),
      }),
    },
    handler: async (req) => {
      const { bookingId, gateway } = req.body as { bookingId: string; gateway: 'VNPAY' | 'MOMO' | 'ZALOPAY' };
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) throw errors.notFound('Booking', bookingId);
      if (booking.organizerId !== req.auth!.userId) throw errors.forbidden();
      if (booking.status !== 'PENDING_PAYMENT') throw errors.conflict('Booking is not pending payment');

      const adapter =
        gateway === 'VNPAY' ? buildVnpay() : gateway === 'MOMO' ? buildMomo() : buildZaloPay();

      const idemp = idempotencyKey('pay');
      const returnUrl =
        gateway === 'VNPAY'
          ? env.VNPAY_RETURN_URL!
          : gateway === 'MOMO'
            ? env.MOMO_RETURN_URL!
            : env.ZALOPAY_CALLBACK_URL!;
      const ipnUrl =
        gateway === 'VNPAY'
          ? env.VNPAY_IPN_URL!
          : gateway === 'MOMO'
            ? env.MOMO_IPN_URL!
            : env.ZALOPAY_CALLBACK_URL!;

      const init = await adapter.init({
        amountVnd: booking.priceVnd,
        bookingCode: booking.code,
        bookingId: booking.id,
        description: `Booking ${booking.code}`,
        returnUrl,
        ipnUrl,
        idempotencyKey: idemp,
        ipAddress: req.ip,
      });

      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          gateway,
          amountVnd: booking.priceVnd,
          status: 'PENDING',
          idempotencyKey: idemp,
        },
      });
      return { redirectUrl: init.redirectUrl };
    },
  });
};
