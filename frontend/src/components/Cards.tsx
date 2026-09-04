// Sổ cái: Lãi là hero nền đen duy nhất, Thu/Chi là hai dòng nhỏ viền trái màu.
// Không dùng 3 card giống hệt nhau (tránh SaaS-card kit).

export function formatVND(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
}

export function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "red" | "dark";
}) {
  if (tone === "dark") {
    return (
      <div className="rounded-2xl bg-[#111827] p-5 text-white">
        <div className="text-sm text-slate-300">{label}</div>
        <div
          className="mt-1 font-bold tabular-nums"
          style={{ fontFamily: '"Be Vietnam Pro", Inter, system-ui, sans-serif', fontSize: "2rem", lineHeight: 1.1 }}
        >
          {formatVND(value)}
        </div>
      </div>
    );
  }
  const edge = tone === "green" ? "border-l-[#16A34A]" : "border-l-[#DC2626]";
  const num = tone === "green" ? "text-green-700" : "text-red-700";
  return (
    <div className={`rounded-xl border border-[#E2E8E0] border-l-4 ${edge} bg-white px-4 py-3`}>
      <div className="text-sm text-[#64748B]">{label}</div>
      <div
        className={`mt-0.5 text-xl font-bold tabular-nums ${num}`}
        style={{ fontFamily: '"Be Vietnam Pro", Inter, system-ui, sans-serif' }}
      >
        {formatVND(value)}
      </div>
    </div>
  );
}

export function OverdueBadge() {
  return (
    <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
      Quá hạn
    </span>
  );
}
