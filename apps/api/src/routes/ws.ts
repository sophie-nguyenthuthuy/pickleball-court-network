/**
 * WebSocket gateway. Two channels at v0.1:
 *   - /ws/court/:courtId    → live slot updates so the booking UI re-renders when
 *                             another user holds a slot.
 *   - /ws/tournament/:slug  → live scoring for tournament watchers.
 *
 * Pub/sub is fanned out via Redis so multiple API instances stay in sync.
 */
import Redis from 'ioredis';
import type { FastifyInstance } from 'fastify';

import { env } from '../env.js';

export const wsRoutes = async (app: FastifyInstance): Promise<void> => {
  const sub = new Redis(env.REDIS_URL);

  app.get('/court/:courtId', { websocket: true }, async (socket, req) => {
    const courtId = (req.params as { courtId: string }).courtId;
    const channel = `court:${courtId}`;
    const onMessage = (chan: string, msg: string) => {
      if (chan === channel) socket.send(msg);
    };
    await sub.subscribe(channel);
    sub.on('message', onMessage);
    socket.on('close', () => {
      sub.off('message', onMessage);
      void sub.unsubscribe(channel);
    });
  });

  app.get('/tournament/:slug', { websocket: true }, async (socket, req) => {
    const slug = (req.params as { slug: string }).slug;
    const channel = `tournament:${slug}`;
    const onMessage = (chan: string, msg: string) => {
      if (chan === channel) socket.send(msg);
    };
    await sub.subscribe(channel);
    sub.on('message', onMessage);
    socket.on('close', () => {
      sub.off('message', onMessage);
      void sub.unsubscribe(channel);
    });
  });
};
