import { startTracing } from '@pcn/observability';

import { env } from './env.js';

// Tracing must initialise BEFORE any instrumented import.
startTracing({ service: 'pcn-api', endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT });

import { build } from './app.js';
import { createLogger } from '@pcn/observability';

const logger = createLogger({ service: 'pcn-api', pretty: env.NODE_ENV === 'development' });

const start = async () => {
  const app = await build({ logger });
  try {
    await app.listen({ port: env.API_PORT, host: env.API_HOST });
    logger.info({ port: env.API_PORT }, 'api listening');
  } catch (err) {
    logger.error({ err }, 'failed to start api');
    process.exit(1);
  }
};

void start();
