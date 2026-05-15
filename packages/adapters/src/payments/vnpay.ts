/**
 * VNPay (NCB / VietinBank / Vietcombank et al.) payment gateway adapter.
 *
 * Flow:
 *   1. Client POSTs to /payments/init → server builds vnp_* params,
 *      sorts them alphabetically, HMAC-SHA512 with vnp_HashSecret, and
 *      returns the redirect URL.
 *   2. After payment, VNPay redirects user to vnp_ReturnUrl AND sends an
 *      IPN callback to vnp_IpnUrl. We trust ONLY the IPN for state changes
 *      (return URL is for UX only).
 *   3. verifyCallback re-builds the hash and constant-time compares.
 *
 * Docs: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
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

export interface VnpayConfig {
  tmnCode: string;
  hashSecret: string;
  payUrl: string;
}

const VND_MULTIPLIER = 100n; // VNPay expects amount * 100

const yyyymmddhhmmss = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds())
  );
};

const sortAndEncode = (params: Record<string, string>): string => {
  const keys = Object.keys(params).sort();
  return keys.map((k) => `${k}=${encodeURIComponent(params[k]!).replace(/%20/g, '+')}`).join('&');
};

const sign = (data: string, secret: string): string =>
  createHmac('sha512', secret).update(Buffer.from(data, 'utf-8')).digest('hex');

const safeEq = (a: string, b: string): boolean => {
  const ab = Buffer.from(a, 'utf-8');
  const bb = Buffer.from(b, 'utf-8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
};

export const createVnpay = (cfg: VnpayConfig): PaymentAdapter => ({
  gateway: 'VNPAY',

  async init(input: PaymentInitInput): Promise<PaymentInitResult> {
    const txnRef = `${input.bookingCode}-${Date.now()}`;
    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: cfg.tmnCode,
      vnp_Locale: input.locale === 'en' ? 'en' : 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: input.description,
      vnp_OrderType: 'other',
      vnp_Amount: (input.amountVnd * VND_MULTIPLIER).toString(),
      vnp_ReturnUrl: input.returnUrl,
      vnp_IpAddr: input.ipAddress ?? '127.0.0.1',
      vnp_CreateDate: yyyymmddhhmmss(new Date()),
    };
    const signedData = sortAndEncode(params);
    const secureHash = sign(signedData, cfg.hashSecret);
    const redirectUrl = `${cfg.payUrl}?${signedData}&vnp_SecureHash=${secureHash}`;
    return { gateway: 'VNPAY', redirectUrl, gatewayRequestId: txnRef };
  },

  verifyCallback(cb: PaymentCallback): PaymentVerifyResult {
    const raw = cb.raw as Record<string, string>;
    const incomingHash = raw.vnp_SecureHash;
    if (!incomingHash) throw errors.paymentSignatureInvalid();
    const filtered: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith('vnp_') && k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType' && v != null) {
        filtered[k] = String(v);
      }
    }
    const expectedHash = sign(sortAndEncode(filtered), cfg.hashSecret);
    if (!safeEq(expectedHash, incomingHash)) throw errors.paymentSignatureInvalid();
    const responseCode = raw.vnp_ResponseCode;
    const txnStatus = raw.vnp_TransactionStatus;
    const ok = responseCode === '00' && txnStatus === '00';
    const txnRef = raw.vnp_TxnRef ?? '';
    return {
      ok,
      gatewayTxnId: raw.vnp_TransactionNo ?? raw.vnp_BankTranNo,
      amountVnd: raw.vnp_Amount ? BigInt(raw.vnp_Amount) / VND_MULTIPLIER : undefined,
      bookingId: txnRef.split('-')[0],
      failureCode: ok ? undefined : responseCode,
      message: ok ? 'OK' : `VNPay responseCode=${responseCode}, status=${txnStatus}`,
    };
  },
});
