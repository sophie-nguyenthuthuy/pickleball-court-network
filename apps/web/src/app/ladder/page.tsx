export default function LadderPage() {
  return (
    <main className="container-narrow py-12">
      <h1 className="text-3xl font-bold">Bảng xếp hạng amateur</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Ladder PCN dùng hệ số Glicko-2 — chính xác hơn ELO cho cộng đồng nghiệp dư. Mỗi tuần xếp hạng theo
        khu vực và sport.
      </p>
      <p className="mt-8 text-slate-500">Bảng xếp hạng đang được khởi tạo. Theo dõi Zalo OA @PCN để biết khi nào mở đăng ký.</p>
    </main>
  );
}
