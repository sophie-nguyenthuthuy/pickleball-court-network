import { randomInt, createHash } from 'node:crypto';

import { errors, uuid } from '@pcn/core';
import { prisma } from '@pcn/db';
import argon2 from 'argon2';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { env } from '../env.js';

const E164_VN = /^\+?84\d{9}$/;

const hashCode = (code: string): string =>
  createHash('sha256').update(code + env.HASH_PEPPER).digest('hex');

export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  // -------- request OTP --------
  app.post('/otp/request', {
    schema: {
      body: z.object({
        phone: z.string().regex(E164_VN, 'Phone must be a Vietnamese number in E.164 format'),
        channel: z.enum(['SMS', 'ZALO_ZNS']).default('SMS'),
      }),
    },
    handler: async (req) => {
      const { phone, channel } = req.body as { phone: string; channel: 'SMS' | 'ZALO_ZNS' };

      // throttle: at most 3 unconsumed OTPs in the last 10 minutes
      const since = new Date(Date.now() - 10 * 60_000);
      const recent = await prisma.otpRequest.count({
        where: { phone, consumedAt: null, createdAt: { gte: since } },
      });
      if (recent >= 3) throw errors.rateLimited('Too many OTP requests; try again shortly.');

      const code = String(randomInt(100_000, 999_999));
      await prisma.otpRequest.create({
        data: {
          id: uuid(),
          phone,
          channel,
          codeHash: hashCode(code),
          expiresAt: new Date(Date.now() + 5 * 60_000),
        },
      });
      // TODO: hand off to worker via outbox to actually send via eSMS/Zalo ZNS
      req.log.info({ phone, channel }, 'OTP requested');
      return { ok: true };
    },
  });

  // -------- verify OTP & issue tokens --------
  app.post('/otp/verify', {
    schema: {
      body: z.object({
        phone: z.string().regex(E164_VN),
        code: z.string().regex(/^\d{6}$/),
        displayName: z.string().min(1).max(120).optional(),
      }),
    },
    handler: async (req, reply) => {
      const { phone, code, displayName } = req.body as {
        phone: string;
        code: string;
        displayName?: string;
      };
      const otp = await prisma.otpRequest.findFirst({
        where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      });
      if (!otp) throw errors.validation('Invalid or expired OTP');
      if (otp.attempts >= 5) throw errors.validation('OTP exceeded attempt limit');
      if (otp.codeHash !== hashCode(code)) {
        await prisma.otpRequest.update({ where: { id: otp.id }, data: { attempts: otp.attempts + 1 } });
        throw errors.validation('Invalid OTP');
      }

      const user = await prisma.user.upsert({
        where: { phone },
        update: { phoneVerifiedAt: new Date() },
        create: {
          phone,
          phoneVerifiedAt: new Date(),
          displayName: displayName ?? phone,
          slug: phone.replace(/\W/g, '').slice(-10),
        },
      });
      await prisma.otpRequest.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

      const accessToken = await reply.jwtSign({ sub: user.id, roles: user.roles });
      const refreshToken = await reply.jwtSign({ sub: user.id, kind: 'refresh' }, { expiresIn: env.JWT_REFRESH_TTL });
      const refreshHash = await argon2.hash(refreshToken);
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: refreshHash,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          deviceLabel: req.headers['user-agent']?.slice(0, 120) ?? null,
          ipAddress: req.ip,
        },
      });

      return { accessToken, refreshToken, user: { id: user.id, displayName: user.displayName, roles: user.roles } };
    },
  });

  // -------- Zalo Login OAuth: redirect URL builder --------
  app.get('/zalo/login-url', async () => {
    if (!env.ZALO_LOGIN_APP_ID || !env.ZALO_LOGIN_REDIRECT_URI) {
      throw errors.validation('Zalo Login is not configured');
    }
    const state = uuid();
    const url = new URL('https://oauth.zaloapp.com/v4/permission');
    url.searchParams.set('app_id', env.ZALO_LOGIN_APP_ID);
    url.searchParams.set('redirect_uri', env.ZALO_LOGIN_REDIRECT_URI);
    url.searchParams.set('state', state);
    return { url: url.toString(), state };
  });
};
