export type Gateway = 'VNPAY' | 'MOMO' | 'ZALOPAY' | 'VIETQR' | 'CASH';

export interface PaymentInitInput {
  amountVnd: bigint;
  bookingCode: string;
  bookingId: string;
  description: string;
  returnUrl: string;
  ipnUrl: string;
  ipAddress?: string;
  /** Idempotency key the caller has already minted. */
  idempotencyKey: string;
  /** Optional locale override; default vi-VN. */
  locale?: 'vi' | 'en';
}

export interface PaymentInitResult {
  gateway: Gateway;
  redirectUrl: string;
  gatewayRequestId: string;
}

export interface PaymentCallback {
  /** Raw callback as received (form-encoded or JSON, gateway-specific). */
  raw: Record<string, string | number | boolean | null>;
}

export interface PaymentVerifyResult {
  ok: boolean;
  gatewayTxnId?: string;
  amountVnd?: bigint;
  bookingId?: string;
  failureCode?: string;
  message?: string;
}

export interface PaymentAdapter {
  readonly gateway: Gateway;
  init(input: PaymentInitInput): Promise<PaymentInitResult>;
  verifyCallback(cb: PaymentCallback): PaymentVerifyResult;
}
