export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Tổng quan</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <KpiCard label="Lượt đặt hôm nay" value="—" />
        <KpiCard label="Doanh thu hôm nay" value="—" />
        <KpiCard label="Sân active" value="—" />
      </div>
      <p className="mt-6 text-sm text-slate-500">
        Dashboard rỗng — đăng nhập với tài khoản ADMIN/COURT_OWNER để xem dữ liệu thật.
      </p>
    </div>
  );
}

const KpiCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border bg-white p-5">
    <div className="text-sm text-slate-500">{label}</div>
    <div className="mt-2 text-3xl font-bold tabular-nums">{value}</div>
  </div>
);
