import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import websocket from '@fastify/websocket';
import { DomainError } from '@pcn/core';
import type { Logger } from '@pcn/observability';
import Fastify, { type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';

import { env } from './env.js';
import { authRoutes } from './routes/auth.js';
import { bookingRoutes } from './routes/bookings.js';
import { courtRoutes } from './routes/courts.js';
import { ladderRoutes } from './routes/ladders.js';
import { paymentRoutes } from './routes/payments.js';
import { tournamentRoutes } from './routes/tournaments.js';
import { userRoutes } from './routes/users.js';
import { venueRoutes } from './routes/venues.js';
import { webhookRoutes } from './routes/webhooks.js';
import { wsRoutes } from './routes/ws.js';

export interface BuildOptions {
  logger: Logger;
}

export const build = async (opts: BuildOptions): Promise<FastifyInstance> => {
  const app = Fastify({
    loggerInstance: opts.logger,
    trustProxy: true,
    bodyLimit: 2 * 1024 * 1024,
    disableRequestLogging: false,
    genReqId: (req) => (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID(),
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: env.API_CORS_ORIGINS ? env.API_CORS_ORIGINS.split(',') : true,
    credentials: true,
  });
  await app.register(sensible);
  await app.register(rateLimit, { max: 600, timeWindow: '1 minute' });
  await app.register(jwt, { secret: env.JWT_SECRET, sign: { expiresIn: env.JWT_ACCESS_TTL } });
  await app.register(websocket);
  await app.register(swagger, {
    openapi: {
      info: { title: 'PCN API', version: '0.1.0' },
      servers: [{ url: env.PUBLIC_API_URL }],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  // Health checks first — fast and unauthenticated.
  app.get('/healthz', async () => ({ ok: true }));
  app.get('/readyz', async () => ({ ok: true, version: '0.1.0' }));

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof DomainError) {
      reply.status(err.status).send({
        error: { code: err.code, message: err.message, details: err.details },
      });
      return;
    }
    if ((err as { statusCode?: number }).statusCode === 429) {
      reply.status(429).send({ error: { code: 'RATE_LIMITED', message: err.message } });
      return;
    }
    req.log.error({ err }, 'unhandled error');
    reply.status(500).send({ error: { code: 'INTERNAL', message: 'Internal error' } });
  });

  await app.register(authRoutes, { prefix: '/v1/auth' });
  await app.register(userRoutes, { prefix: '/v1/me' });
  await app.register(venueRoutes, { prefix: '/v1/venues' });
  await app.register(courtRoutes, { prefix: '/v1/courts' });
  await app.register(bookingRoutes, { prefix: '/v1/bookings' });
  await app.register(paymentRoutes, { prefix: '/v1/payments' });
  await app.register(ladderRoutes, { prefix: '/v1/ladders' });
  await app.register(tournamentRoutes, { prefix: '/v1/tournaments' });
  await app.register(webhookRoutes, { prefix: '/webhooks' });
  await app.register(wsRoutes, { prefix: '/ws' });

  return app;
};
