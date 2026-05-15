import { CommonEnv } from '@pcn/config';
import { createLogger, startTracing } from '@pcn/observability';

import { startOutboxDispatcher } from './queues/outbox.js';
import { startReminderScheduler } from './queues/reminders.js';
import { startRatingsRecomputer } from './queues/ratings.js';
import { startHoldExpirySweeper } from './queues/holds.js';

const env = CommonEnv.parse(process.env);
startTracing({ service: 'pcn-worker', endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT });

const logger = createLogger({ service: 'pcn-worker', pretty: env.NODE_ENV === 'development' });

logger.info('worker booting');

await Promise.all([
  startOutboxDispatcher(logger),
  startReminderScheduler(logger),
  startRatingsRecomputer(logger),
  startHoldExpirySweeper(logger),
]);

const shutdown = async () => {
  logger.info('worker shutting down');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
