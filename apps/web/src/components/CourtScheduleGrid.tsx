'use client';

import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useState } from 'react';

import { apiBrowser } from '@/lib/api';

interface Props {
  courtId: string;
  date: string;
}

export const CourtScheduleGrid = ({ courtId, date }: Props) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data, isLoading, isError } = useQuery({
    queryKey: ['slots', courtId, date],
    queryFn: () => apiBrowser().listSlots(courtId, date),
  });

  if (isLoading) return <p className="text-sm text-slate-500">Đang tải...</p>;
  if (isError) return <p className="text-sm text-red-600">Không tải được khung giờ.</p>;
  if (!data) return null;

  const totalVnd = data.slots
    .filter((s) => selected.has(s.start))
    .reduce((acc, s) => acc + Number(s.priceVnd), 0);

  return (
    <div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {data.slots.map((s) => {
          const isSelected = selected.has(s.start);
          return (
            <button
              key={s.start}
              type="button"
              disabled={!s.available}
              onClick={() => {
                const next = new Set(selected);
                if (isSelected) next.delete(s.start);
                else next.add(s.start);
                setSelected(next);
              }}
              className={clsx(
                'rounded-md border px-2 py-2 text-xs',
                !s.available && 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400',
                s.available && !isSelected && 'border-slate-200 hover:border-brand-500',
                s.available && isSelected && 'border-brand-600 bg-brand-600 text-white',
              )}
            >
              <div className="font-medium">{new Date(s.start).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
              <div className="text-[10px] opacity-80">{Number(s.priceVnd).toLocaleString('vi-VN')}đ</div>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span>{selected.size > 0 ? `${selected.size} slot · ${totalVnd.toLocaleString('vi-VN')}đ` : 'Chọn khung giờ'}</span>
        <button className="btn-primary disabled:opacity-50" disabled={selected.size === 0}>
          Đặt sân
        </button>
      </div>
    </div>
  );
};
