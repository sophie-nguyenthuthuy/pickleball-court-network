import Link from 'next/link';

import { SearchHero } from '@/components/SearchHero';
import { VenueGrid } from '@/components/VenueGrid';
import { apiServer } from '@/lib/api';

export default async function HomePage() {
  const featured = await apiServer()
    .searchVenues({ city: 'Hồ Chí Minh', page: 1 })
    .catch(() => ({ items: [], page: 1, total: 0 }));

  return (
    <main>
      <SearchHero />
      <section className="container-narrow py-12">
        <header className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Sân nổi bật</h2>
            <p className="text-slate-600">Đặt nhanh — khung giờ thật, giá thật.</p>
          </div>
          <Link href="/sân" className="text-sm text-brand-700 hover:underline">
            Xem tất cả →
          </Link>
        </header>
        <div className="mt-6">
          <VenueGrid items={featured.items} />
        </div>
      </section>
      <section className="bg-slate-50 py-16">
        <div className="container-narrow grid gap-8 md:grid-cols-3">
          <Pillar title="Đặt qua Zalo" body="Nhắn @PCN trên Zalo, bot sẽ giữ chỗ ngay. Không cần app riêng." />
          <Pillar title="Ladder &amp; xếp hạng" body="Glicko-2 rating chuẩn quốc tế. Tham gia ladder khu vực của bạn." />
          <Pillar title="Giải đấu cộng đồng" body="Đăng ký, bốc thăm, live score cho club và sponsor." />
        </div>
      </section>
    </main>
  );
}

const Pillar = ({ title, body }: { title: string; body: string }) => (
  <article className="card p-6">
    <h3 className="text-lg font-semibold">{title}</h3>
    <p className="mt-2 text-sm text-slate-600">{body}</p>
  </article>
);
