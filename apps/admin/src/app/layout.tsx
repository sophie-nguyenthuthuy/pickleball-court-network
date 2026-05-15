import Link from 'next/link';

import './globals.css';

export const metadata = { title: 'PCN Admin' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-dvh bg-slate-100 text-slate-900">
        <div className="flex min-h-dvh">
          <Sidebar />
          <div className="flex-1">
            <header className="border-b bg-white px-6 py-3 text-sm text-slate-500">
              PCN Operations
            </header>
            <main className="p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

const Sidebar = () => (
  <aside className="w-56 border-r bg-white px-3 py-4">
    <div className="px-3 text-lg font-bold tracking-tight">PCN</div>
    <nav className="mt-6 space-y-1 text-sm">
      <NavLink href="/" label="Dashboard" />
      <NavLink href="/venues" label="Sân" />
      <NavLink href="/bookings" label="Lịch đặt" />
      <NavLink href="/payouts" label="Thanh toán chủ sân" />
      <NavLink href="/tournaments" label="Giải đấu" />
      <NavLink href="/ladders" label="Ladder" />
      <NavLink href="/users" label="Người dùng" />
      <NavLink href="/audit" label="Audit log" />
    </nav>
  </aside>
);

const NavLink = ({ href, label }: { href: string; label: string }) => (
  <Link href={href} className="block rounded-md px-3 py-2 hover:bg-slate-100">
    {label}
  </Link>
);
