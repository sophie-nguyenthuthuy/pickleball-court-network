import { notFound } from 'next/navigation';

import { CourtScheduleGrid } from '@/components/CourtScheduleGrid';
import { apiServer } from '@/lib/api';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string }>;
}

export default async function VenueDetail({ params, searchParams }: Props) {
  const { slug } = await params;
  const { date } = await searchParams;
  const venue = await apiServer().getVenue(slug).catch(() => null);
  if (!venue) notFound();
  const today = date ?? new Date().toISOString().slice(0, 10);

  return (
    <main className="container-narrow py-10">
      <header>
        <h1 className="text-3xl font-bold">{venue.name}</h1>
        <p className="mt-1 text-slate-600">
          {venue.addressLine}, {venue.district}, {venue.city}
        </p>
      </header>

      <section className="mt-8 space-y-6">
        <h2 className="text-xl font-semibold">Lịch trống — {today}</h2>
        {venue.courts.map((c) => (
          <article key={c.id} className="card p-4">
            <h3 className="text-base font-semibold">{c.name}</h3>
            <p className="text-sm text-slate-500">
              {c.surface} · {c.kind}
            </p>
            <div className="mt-3">
              <CourtScheduleGrid courtId={c.id} date={today} />
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
