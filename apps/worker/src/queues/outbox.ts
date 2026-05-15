/**
 * Outbox dispatcher. Polls the OutboxEvent table for PENDING rows and fans
 * them out to dedicated BullMQ queues (one per topic). This is the canonical
 * pattern for transactional outboxes — keeps our DB writes and external
 * side effects in lock-step.
 */
import { prisma } from '@pcn/db';
import type { Logger } from '@pcn/observability';
import { Queue } from 'bullmq';

import { redisOptions } from '../redis.js';

const POLL_INTERVAL_MS = 2_000;
const BATCH = 50;

const queues = new Map<string, Queue>();
const queueFor = (topic: string): Queue => {
  let q = queues.get(topic);
  if (!q) {
    q = new Queue(`pcn:${topic}`, redisOptions);
    queues.set(topic, q);
  }
  return q;
};

export const startOutboxDispatcher = async (logger: Logger): Promise<void> => {
  logger.info('outbox dispatcher started');
  const tick = async () => {
    try {
      const events = await prisma.outboxEvent.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: BATCH,
      });
      for (const e of events) {
        try {
          await queueFor(e.topic).add(e.topic, e.payload, {
            jobId: e.id,
            removeOnComplete: 100,
            removeOnFail: 1000,
            attempts: 5,
            backoff: { type: 'exponential', delay: 5_000 },
          });
          await prisma.outboxEvent.update({
            where: { id: e.id },
            data: { status: 'DISPATCHED', dispatchedAt: new Date() },
          });
        } catch (err) {
          await prisma.outboxEvent.update({
            where: { id: e.id },
            data: { status: 'FAILED', failedAt: new Date(), attempts: e.attempts + 1 },
          });
          logger.error({ err, eventId: e.id, topic: e.topic }, 'outbox dispatch failed');
        }
      }
    } catch (err) {
      logger.error({ err }, 'outbox tick failed');
    }
    setTimeout(tick, POLL_INTERVAL_MS);
  };
  void tick();
};
