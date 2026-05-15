'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otp, setOtp] = useState('');

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/auth/otp/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone, channel: 'ZALO_ZNS' }),
    });
    setStep('otp');
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/auth/otp/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone, code: otp }),
    });
    if (res.ok) location.assign('/me');
  };

  return (
    <main className="container-narrow max-w-md py-16">
      <h1 className="text-2xl font-semibold">Đăng nhập</h1>
      <p className="mt-1 text-sm text-slate-600">Nhận mã OTP qua Zalo ZNS (hoặc SMS dự phòng).</p>
      <form className="mt-8 space-y-3" onSubmit={step === 'phone' ? requestOtp : verifyOtp}>
        <input
          className="w-full rounded-md border-slate-200 px-3 py-2"
          placeholder="+8490..."
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={step === 'otp'}
          required
        />
        {step === 'otp' && (
          <input
            className="w-full rounded-md border-slate-200 px-3 py-2"
            placeholder="6 chữ số"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            inputMode="numeric"
            required
          />
        )}
        <button type="submit" className="btn-primary w-full">
          {step === 'phone' ? 'Gửi mã' : 'Xác nhận'}
        </button>
      </form>
    </main>
  );
}
