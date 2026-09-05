import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  const [history, setHistory] = useState<{ m: string; thu: number; chi: number }[]>([]);

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

  useEffect(() => {
    let alive = true;
    const [y, mo] = month.split("-").map(Number);
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, mo - 1 - i, 1);
      months.push(`${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}`);
    }
    Promise.all(months.map((m) => getDashboard(m).catch(() => null))).then((res) => {
      if (!alive) return;
      setHistory(
        res.map((r, i) => ({
          m: months[i].slice(5) + "/" + months[i].slice(2, 4),
          thu: r?.income ?? 0,
          chi: r?.expense ?? 0,
        })),
      );
    });
    return () => {
      alive = false;
    };
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

  const totalBalance = data.totalBalance ?? 0;
  const expenseByCategory = data.expenseByCategory ?? [];

  return (
    <div className="space-y-6">
      <section>
        <StatCard label="Tổng tiền" value={totalBalance} tone="dark" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <StatCard label="Thu tháng này" value={data.income} tone="green" />
          <StatCard label="Chi tháng này" value={data.expense} tone="red" />
        </div>
        <div className="mt-3">
          <StatCard label="Lãi tháng này" value={data.profit} tone="plain" />
        </div>
      </section>

      <section className="rounded-2xl border border-[#E2E8E0] bg-white/85 p-4 backdrop-blur">
        <h2 className="text-base font-bold text-[#111827]">Dòng tiền 6 tháng</h2>
        {history.every((h) => h.thu === 0 && h.chi === 0) ? (
          <p className="mt-2 text-sm text-[#64748B]">Chưa có số liệu các tháng trước.</p>
        ) : (
          <div className="mt-2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <XAxis dataKey="m" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => formatVND(Number(v ?? 0))}
                  contentStyle={{ borderRadius: 12, fontSize: 12 }}
                />
                <Bar dataKey="thu" name="Thu" fill="#16A34A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="chi" name="Chi" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-base font-bold text-[#111827]">Chi theo mảng</h2>
        {expenseByCategory.length === 0 ? (
          <p className="mt-2 text-sm text-[#64748B]">Tháng này chưa có khoản chi nào.</p>
        ) : (
          <div className="mt-2 rounded-xl border border-[#E2E8E0] bg-white p-4">
            <div className="mx-auto h-44 max-w-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    dataKey="total"
                    nameKey="category"
                    innerRadius="55%"
                    outerRadius="90%"
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {expenseByCategory.map((c, i) => (
                      <Cell
                        key={c.category}
                        fill={["#DC2626", "#EA580C", "#D97706", "#16A34A", "#0D9488", "#64748B"][i % 6]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatVND(Number(v ?? 0))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 space-y-2">
              {expenseByCategory.map((c, i) => (
                <li key={c.category} className="flex items-baseline gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: ["#DC2626", "#EA580C", "#D97706", "#16A34A", "#0D9488", "#64748B"][i % 6] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-[#111827]">{c.category}</span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-[#111827]">{formatVND(c.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
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

