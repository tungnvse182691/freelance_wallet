import { useEffect, useState } from "react";
import { getDashboard } from "../api/client";
import type { DashboardResponse } from "../types";
import { useToast } from "../components/Toast";
import { OverdueBadge, StatCard, formatVND } from "../components/Cards";

function fmtDate(d?: string | null): string {
  if (!d) return "Chưa hẹn ngày";
  const [y, m, day] = d.split("-");
  return y && m && day ? `${day}/${m}/${y}` : d;
}

export default function Dashboard({ month }: { month: string }) {
  const toast = useToast();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getDashboard(month)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e: unknown) => {
        toast.error(e);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
        </div>
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-[#E2E8E0] bg-white p-6 text-center">
        <p className="text-sm text-[#64748B]">Không tải được số liệu. Kiểm tra BE rồi thử lại.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <StatCard label="Lãi tháng này" value={data.profit} tone="dark" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <StatCard label="Thu" value={data.income} tone="green" />
          <StatCard label="Chi" value={data.expense} tone="red" />
        </div>
      </section>

      <section>
        <h2 className="text-base font-bold text-[#111827]">
          Cần đòi nợ {data.overdue.length > 0 && <span className="text-red-700">({data.overdue.length})</span>}
        </h2>
        {data.overdue.length === 0 ? (
          <p className="mt-2 text-sm text-[#64748B]">Không có job nào quá hạn. Tháng này nhẹ đầu.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[#E2E8E0] rounded-xl border border-[#E2E8E0] bg-white">
            {data.overdue.map((o) => (
              <li key={o.projectId} className="flex items-center gap-3 border-l-4 border-l-red-600 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[#111827]">{o.title}</div>
                  <div className="mt-0.5 text-xs text-[#64748B]">
                    {o.clientName} · hạn {fmtDate(o.deadline)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold tabular-nums text-[#111827]">{formatVND(o.price)}</div>
                  <div className="mt-1">
                    <OverdueBadge />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-base font-bold text-[#111827]">
          Job đang làm {data.doing.length > 0 && <span className="font-normal text-[#64748B]">({data.doing.length})</span>}
        </h2>
        {data.doing.length === 0 ? (
          <p className="mt-2 text-sm text-[#64748B]">Chưa có job dở dang. Thêm job mới ở tab Job.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[#E2E8E0] rounded-xl border border-[#E2E8E0] bg-white">
            {data.doing.map((j) => (
              <li key={j.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[#111827]">{j.title}</div>
                  <div className="mt-0.5 text-xs text-[#64748B]">
                    {j.clientName} · hạn {fmtDate(j.deadline)}
                  </div>
                </div>
                <div className="shrink-0 text-sm font-bold tabular-nums text-[#111827]">{formatVND(j.price)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
