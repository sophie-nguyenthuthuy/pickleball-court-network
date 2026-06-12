import { VenueGrid } from '@/components/VenueGrid';
import { apiServer } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ city?: string; district?: string; sport?: 'PICKLEBALL' | 'PADEL' }>;
}

export default async function VenueListPage({ searchParams }: Props) {
  const params = await searchParams;
  const result = await apiServer()
    .searchVenues({ city: params.city, district: params.district, sport: params.sport })
    .catch(() => ({ items: [], page: 1, total: 0 }));

  return (
    <main className="container-narrow py-12">
      <h1 className="text-2xl font-semibold">
        Sân tại {params.city ?? 'Việt Nam'}
        {params.district ? ` · ${params.district}` : ''}
      </h1>
      <p className="mt-1 text-slate-600">{result.total ?? result.items.length} sân</p>
      <div className="mt-6">
        <VenueGrid items={result.items} />
      </div>
    </main>
  );
}
