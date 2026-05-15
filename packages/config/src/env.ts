import { z } from 'zod';

/**
 * Single source of truth for env-var parsing. Apps import the slice they need
 * and call `.parse(process.env)` once at boot — fail fast on misconfiguration.
 */

export const CommonEnv = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
});

export const ApiEnv = CommonEnv.extend({
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().default('0.0.0.0'),
  API_CORS_ORIGINS: z.string().default(''),
  PUBLIC_API_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  HASH_PEPPER: z.string().min(16),
});

export const PaymentsEnv = z.object({
  VNPAY_TMN_CODE: z.string().min(1).optional(),
  VNPAY_HASH_SECRET: z.string().min(1).optional(),
  VNPAY_URL: z.string().url().optional(),
  VNPAY_RETURN_URL: z.string().url().optional(),
  VNPAY_IPN_URL: z.string().url().optional(),

  MOMO_PARTNER_CODE: z.string().optional(),
  MOMO_ACCESS_KEY: z.string().optional(),
  MOMO_SECRET_KEY: z.string().optional(),
  MOMO_ENDPOINT: z.string().url().optional(),
  MOMO_RETURN_URL: z.string().url().optional(),
  MOMO_IPN_URL: z.string().url().optional(),

  ZALOPAY_APP_ID: z.string().optional(),
  ZALOPAY_KEY1: z.string().optional(),
  ZALOPAY_KEY2: z.string().optional(),
  ZALOPAY_ENDPOINT: z.string().url().optional(),
  ZALOPAY_CALLBACK_URL: z.string().url().optional(),
});

export const ZaloEnv = z.object({
  ZALO_OA_ID: z.string().optional(),
  ZALO_OA_ACCESS_TOKEN: z.string().optional(),
  ZALO_OA_REFRESH_TOKEN: z.string().optional(),
  ZALO_OA_SECRET: z.string().optional(),
  ZALO_LOGIN_APP_ID: z.string().optional(),
  ZALO_LOGIN_APP_SECRET: z.string().optional(),
  ZALO_LOGIN_REDIRECT_URI: z.string().url().optional(),
});

export const SmsEnv = z.object({
  ESMS_API_KEY: z.string().optional(),
  ESMS_SECRET_KEY: z.string().optional(),
  ESMS_BRAND_NAME: z.string().default('PCN'),
});

export const StorageEnv = z.object({
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),
  S3_PUBLIC_BASE_URL: z.string().url().optional(),
});

export const ObservabilityEnv = z.object({
  SENTRY_DSN: z.string().url().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_SERVICE_NAME: z.string().default('pcn'),
});

export type CommonEnv = z.infer<typeof CommonEnv>;
export type ApiEnv = z.infer<typeof ApiEnv>;
export type PaymentsEnv = z.infer<typeof PaymentsEnv>;
export type ZaloEnv = z.infer<typeof ZaloEnv>;
export type SmsEnv = z.infer<typeof SmsEnv>;
export type StorageEnv = z.infer<typeof StorageEnv>;
export type ObservabilityEnv = z.infer<typeof ObservabilityEnv>;
