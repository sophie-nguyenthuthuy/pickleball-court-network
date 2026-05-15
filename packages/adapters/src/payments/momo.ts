/**
 * MoMo One-time Payment (HMAC SHA-256). Docs:
 *   https://developers.momo.vn/v3/docs/payment/api/payment-method/onetime/
 *
 * Init posts JSON to MoMo's create endpoint; the response contains a `payUrl`
 * we redirect to. The IPN callback delivers a JSON body that includes a
 * `signature` over a deterministic field list — we re-compute and compare.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

import { errors } from '@pcn/core/errors';

import type {
  PaymentAdapter,
  PaymentCallback,
  PaymentInitInput,
  PaymentInitResult,
  PaymentVerifyResult,
} from './types.js';

export interface MomoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  endpoint: string;
}

const sign = (data: string, secret: string): string =>
  createHmac('sha256', secret).update(data).digest('hex');

const safeEq = (a: string, b: string): boolean => {
  const ab = Buffer.from(a, 'utf-8');
  const bb = Buffer.from(b, 'utf-8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
};

export const createMomo = (cfg: MomoConfig): PaymentAdapter => ({
  gateway: 'MOMO',

  async init(input: PaymentInitInput): Promise<PaymentInitResult> {
    const requestId = `${input.bookingCode}-${Date.now()}`;
    const orderId = input.bookingCode;
    const amount = input.amountVnd.toString();
    const orderInfo = input.description;
    const requestType = 'captureWallet';
    const extraData = Buffer.from(JSON.stringify({ bookingId: input.bookingId })).toString('base64');
    const rawSignature =
      `accessKey=${cfg.accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${input.ipnUrl}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${cfg.partnerCode}` +
      `&redirectUrl=${input.returnUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;
    const signature = sign(rawSignature, cfg.secretKey);
    const body = {
      partnerCode: cfg.partnerCode,
      partnerName: 'PCN',
      storeId: 'PCN',
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: input.returnUrl,
      ipnUrl: input.ipnUrl,
      lang: input.locale === 'en' ? 'en' : 'vi',
      requestType,
      extraData,
      signature,
    };
    const res = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw errors.paymentFailed(`MoMo init HTTP ${res.status}`);
    }
    const json = (await res.json()) as { payUrl?: string; resultCode?: number; message?: string };
    if (!json.payUrl) {
      throw errors.paymentFailed(`MoMo init failed: ${json.message ?? json.resultCode}`);
    }
    return { gateway: 'MOMO', redirectUrl: json.payUrl, gatewayRequestId: requestId };
  },

  verifyCallback(cb: PaymentCallback): PaymentVerifyResult {
    const raw = cb.raw as Record<string, string | number>;
    const incoming = String(raw.signature ?? '');
    if (!incoming) throw errors.paymentSignatureInvalid();
    const rawSignature =
      `accessKey=${cfg.accessKey}` +
      `&amount=${raw.amount}` +
      `&extraData=${raw.extraData}` +
      `&message=${raw.message}` +
      `&orderId=${raw.orderId}` +
      `&orderInfo=${raw.orderInfo}` +
      `&orderType=${raw.orderType}` +
      `&partnerCode=${raw.partnerCode}` +
      `&payType=${raw.payType}` +
      `&requestId=${raw.requestId}` +
      `&responseTime=${raw.responseTime}` +
      `&resultCode=${raw.resultCode}` +
      `&transId=${raw.transId}`;
    const expected = sign(rawSignature, cfg.secretKey);
    if (!safeEq(expected, incoming)) throw errors.paymentSignatureInvalid();
    const ok = Number(raw.resultCode) === 0;
    let bookingId: string | undefined;
    try {
      bookingId = JSON.parse(Buffer.from(String(raw.extraData ?? ''), 'base64').toString('utf-8'))
        .bookingId;
    } catch {
      bookingId = undefined;
    }
    return {
      ok,
      gatewayTxnId: String(raw.transId ?? ''),
      amountVnd: raw.amount ? BigInt(raw.amount) : undefined,
      bookingId,
      failureCode: ok ? undefined : String(raw.resultCode),
      message: String(raw.message ?? ''),
    };
  },
});
