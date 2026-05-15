/**
 * ZaloPay merchant gateway. Key1 signs init requests, Key2 signs callbacks.
 * Docs: https://docs.zalopay.vn/v2/start/
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

export interface ZaloPayConfig {
  appId: string;
  key1: string;
  key2: string;
  endpoint: string;
}

const hmac256 = (key: string, data: string): string =>
  createHmac('sha256', key).update(data).digest('hex');

const safeEq = (a: string, b: string): boolean => {
  const ab = Buffer.from(a, 'utf-8');
  const bb = Buffer.from(b, 'utf-8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
};

const yymmdd = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    String(d.getUTCFullYear()).slice(2) + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate())
  );
};

export const createZaloPay = (cfg: ZaloPayConfig): PaymentAdapter => ({
  gateway: 'ZALOPAY',

  async init(input: PaymentInitInput): Promise<PaymentInitResult> {
    const transId = `${yymmdd(new Date())}_${input.bookingCode}_${Date.now()}`;
    const embedData = JSON.stringify({
      redirecturl: input.returnUrl,
      bookingId: input.bookingId,
    });
    const item = JSON.stringify([{ itemid: input.bookingCode, itemname: 'Court booking', itemprice: Number(input.amountVnd), itemquantity: 1 }]);
    const params: Record<string, string | number> = {
      app_id: cfg.appId,
      app_trans_id: transId,
      app_user: input.bookingCode,
      app_time: Date.now(),
      amount: Number(input.amountVnd),
      description: input.description,
      bank_code: '',
      item,
      embed_data: embedData,
      callback_url: input.ipnUrl,
    };
    const macData = [
      params.app_id,
      params.app_trans_id,
      params.app_user,
      params.amount,
      params.app_time,
      params.embed_data,
      params.item,
    ].join('|');
    const mac = hmac256(cfg.key1, macData);
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, mac })) body.set(k, String(v));
    const res = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw errors.paymentFailed(`ZaloPay init HTTP ${res.status}`);
    const json = (await res.json()) as {
      order_url?: string;
      return_code?: number;
      return_message?: string;
    };
    if (json.return_code !== 1 || !json.order_url) {
      throw errors.paymentFailed(`ZaloPay init failed: ${json.return_message}`);
    }
    return { gateway: 'ZALOPAY', redirectUrl: json.order_url, gatewayRequestId: transId };
  },

  verifyCallback(cb: PaymentCallback): PaymentVerifyResult {
    const raw = cb.raw as { data?: string; mac?: string; type?: number };
    if (!raw.data || !raw.mac) throw errors.paymentSignatureInvalid();
    const expected = hmac256(cfg.key2, raw.data);
    if (!safeEq(expected, raw.mac)) throw errors.paymentSignatureInvalid();
    let parsed: { app_trans_id?: string; zp_trans_id?: number; amount?: number; embed_data?: string };
    try {
      parsed = JSON.parse(raw.data);
    } catch {
      throw errors.paymentSignatureInvalid();
    }
    let bookingId: string | undefined;
    try {
      bookingId = JSON.parse(parsed.embed_data ?? '{}').bookingId;
    } catch {
      bookingId = undefined;
    }
    return {
      ok: true,
      gatewayTxnId: parsed.zp_trans_id ? String(parsed.zp_trans_id) : parsed.app_trans_id,
      amountVnd: parsed.amount != null ? BigInt(parsed.amount) : undefined,
      bookingId,
      message: 'OK',
    };
  },
});
