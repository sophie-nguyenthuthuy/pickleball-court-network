'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export const SearchHero = () => {
  const router = useRouter();
  const [city, setCity] = useState('Hồ Chí Minh');
  const [district, setDistrict] = useState('');

  return (
    <section className="bg-gradient-to-br from-brand-50 via-white to-orange-50">
      <div className="container-narrow py-16">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Đặt sân pickleball — đỡ phải nhắn Zalo chủ sân
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Tìm sân quanh bạn, xem khung giờ trống ngay, đặt và trả tiền online qua VNPay / MoMo / ZaloPay.
        </p>
        <form
          className="mt-8 flex flex-col gap-3 rounded-xl bg-white p-3 shadow-md md:flex-row md:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            const params = new URLSearchParams({ city, ...(district ? { district } : {}) });
            router.push(`/san?${params.toString()}`);
          }}
        >
          <select
            className="rounded-md border-slate-200 bg-white px-3 py-2 text-sm"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            <option>Hồ Chí Minh</option>
            <option>Hà Nội</option>
            <option>Đà Nẵng</option>
            <option>Bình Dương</option>
          </select>
          <input
            className="flex-1 rounded-md border-slate-200 px-3 py-2 text-sm"
            placeholder="Quận / huyện (vd: Cầu Giấy, Quận 2…)"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          />
          <button className="btn-primary md:px-6" type="submit">
            Tìm sân
          </button>
        </form>
      </div>
    </section>
  );
};
