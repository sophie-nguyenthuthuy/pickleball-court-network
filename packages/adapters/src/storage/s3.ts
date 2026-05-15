/**
 * S3-compatible storage (Cloudflare R2 in prod, MinIO in dev).
 * Thin wrapper around the AWS SDK v3 — kept as a port so apps don't pull the
 * SDK directly. Used for venue photos, review photos, OA bot attachments.
 */
import { errors } from '@pcn/core/errors';

export interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  forcePathStyle?: boolean;
  publicBaseUrl?: string;
}

export interface SignedUploadUrl {
  url: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
}

/**
 * Mint a presigned PUT URL the browser/mobile can use to upload directly.
 *
 * NOTE: the actual signing is delegated to `@aws-sdk/s3-request-presigner`
 * inside apps/api so this package stays SDK-free and easily testable.
 * This module just defines the contract.
 */
export type PresignFn = (cfg: S3Config, key: string, contentType: string, expiresIn?: number) => Promise<SignedUploadUrl>;

export const buildPublicUrl = (cfg: S3Config, key: string): string => {
  if (cfg.publicBaseUrl) return `${cfg.publicBaseUrl.replace(/\/$/, '')}/${key}`;
  if (cfg.forcePathStyle) return `${cfg.endpoint.replace(/\/$/, '')}/${cfg.bucket}/${key}`;
  // virtual-hosted style; tolerated by most S3-compatible providers
  const url = new URL(cfg.endpoint);
  return `${url.protocol}//${cfg.bucket}.${url.host}/${key}`;
};

export const assertKeyShape = (key: string): void => {
  if (!/^[a-z0-9][a-z0-9/_-]{1,255}$/i.test(key)) {
    throw errors.validation(`Invalid S3 key: ${key}`);
  }
};
