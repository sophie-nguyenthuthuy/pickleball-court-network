import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container-narrow py-24 text-center">
      <h1 className="text-3xl font-bold">404 — Không tìm thấy</h1>
      <p className="mt-2 text-slate-600">Trang bạn cần không tồn tại hoặc đã bị di chuyển.</p>
      <Link href="/" className="mt-6 inline-block text-brand-700 hover:underline">
        ← Về trang chủ
      </Link>
    </main>
  );
}
