import { describe, expect, it } from 'vitest';

import { createVnpay } from './vnpay.js';

const cfg = {
  tmnCode: 'TESTCODE',
  hashSecret: 'TESTSECRET',
  payUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
};

describe('VNPay adapter', () => {
  it('builds a redirect URL with a vnp_SecureHash', async () => {
    const adapter = createVnpay(cfg);
    const result = await adapter.init({
      amountVnd: 200_000n,
      bookingCode: 'PCN-2026-ABCDEF',
      bookingId: '00000000-0000-0000-0000-000000000001',
      description: 'Booking ABCDEF',
      returnUrl: 'http://localhost:3000/return',
      ipnUrl: 'http://localhost:4000/ipn',
      idempotencyKey: 'k',
    });
    expect(result.gateway).toBe('VNPAY');
    expect(result.redirectUrl).toContain('vnp_SecureHash=');
    expect(result.redirectUrl).toContain('vnp_Amount=20000000'); // x100
  });

  it('rejects callbacks with a tampered hash', () => {
    const adapter = createVnpay(cfg);
    expect(() =>
      adapter.verifyCallback({
        raw: {
          vnp_TmnCode: cfg.tmnCode,
          vnp_TxnRef: 'PCN-2026-ABCDEF-1234',
          vnp_Amount: '20000000',
          vnp_ResponseCode: '00',
          vnp_TransactionStatus: '00',
          vnp_SecureHash: 'deadbeef',
        },
      }),
    ).toThrow(/signature/i);
  });
});
