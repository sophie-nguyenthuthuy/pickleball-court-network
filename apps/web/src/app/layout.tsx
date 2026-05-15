import type { Metadata } from 'next';

import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'PCN — Đặt sân pickleball & padel', template: '%s · PCN' },
  description:
    'Đặt sân pickleball và padel tại Hà Nội, TP. Hồ Chí Minh. Khung giờ thật, giá thật, không cần nhắn Zalo chủ sân.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pcn.vn'),
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Pickleball Court Network',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-dvh bg-white text-slate-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
