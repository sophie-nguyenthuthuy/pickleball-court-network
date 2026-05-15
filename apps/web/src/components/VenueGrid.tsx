import Link from 'next/link';
import type { VenueSummary } from '@pcn/sdk';

export const VenueGrid = ({ items }: { items: VenueSummary[] }) => {
  if (!items.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-500">
        Chưa có sân nào.
      </p>
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((v) => (
        <li key={v.id}>
          <Link href={`/sân/${v.slug}`} className="card block overflow-hidden hover:border-brand-500">
            <div className="h-40 w-full bg-gradient-to-br from-brand-500 to-court-line" />
            <div className="p-4">
              <h3 className="text-base font-semibold">{v.name}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {v.district} · {v.city}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                {v.sports.map((s) => (
                  <span key={s} className="rounded-full bg-brand-100 px-2 py-0.5 text-brand-700">
                    {s}
                  </span>
                ))}
                {v.rating ? <span>★ {v.rating.toFixed(1)}</span> : null}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
};
