import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

export interface TracingOptions {
  service: string;
  endpoint?: string;
}

/**
 * Start the OTel Node SDK. Call this BEFORE importing any instrumented
 * module (Fastify, Prisma, etc.) — typically at the very top of `index.ts`.
 * It's safe to call without OTEL_EXPORTER_OTLP_ENDPOINT set; in that case
 * traces are silently dropped.
 */
export const startTracing = (opts: TracingOptions): NodeSDK | null => {
  if (!opts.endpoint) return null;
  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: opts.service,
    }),
    traceExporter: new OTLPTraceExporter({ url: `${opts.endpoint}/v1/traces` }),
    instrumentations: [getNodeAutoInstrumentations()],
  });
  sdk.start();
  return sdk;
};
