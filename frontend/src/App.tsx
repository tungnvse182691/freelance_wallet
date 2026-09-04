import { useState } from "react";
import Dashboard from "./pages/Dashboard";

type Tab = "overview" | "jobs" | "clients" | "txs";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "jobs", label: "Job" },
  { id: "clients", label: "Khách" },
  { id: "txs", label: "Thu chi" },
];

function currentMonth(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

function ComingSoon({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-[#E2E8E0] bg-white p-6 text-center">
      <p className="text-sm text-[#64748B]">{text}</p>
    </div>
  );
}

export default function App() {
  const [month, setMonth] = useState(currentMonth);
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="min-h-screen bg-[#FAFBF9] text-[#111827]">
      <header className="sticky top-0 border-b border-[#E2E8E0] bg-[#FAFBF9]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <img src="/logo.svg" alt="Freelance Wallet" width={32} height={32} />
          <h1 className="text-lg font-bold" style={{ fontFamily: '"Be Vietnam Pro", Inter, system-ui, sans-serif' }}>
            Freelance Wallet
          </h1>
          <div className="ml-auto">
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              aria-label="Chọn tháng"
              className="rounded-lg border border-[#E2E8E0] bg-white px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 px-4 pb-3" aria-label="Điều hướng">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                tab === t.id ? "bg-[#111827] text-white" : "text-[#64748B] hover:bg-slate-200/60 hover:text-[#111827]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        {tab === "overview" && <Dashboard month={month} />}
        {tab === "jobs" && <ComingSoon text="Tab Job làm ở Task 3 — thêm/sửa job, đổi trạng thái, xuất invoice." />}
        {tab === "clients" && <ComingSoon text="Tab Khách làm ở Task 3 — thêm/sửa/xóa khách." />}
        {tab === "txs" && <ComingSoon text="Tab Thu chi làm ở Task 3 — ghi thu/chi theo tháng." />}
      </main>
    </div>
  );
}
