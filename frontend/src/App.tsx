import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Clients from "./pages/Clients";
import Accounts from "./pages/Accounts";
import Transactions from "./pages/Transactions";
import { AmbientBackground } from "./components/Cards";

type Tab = "overview" | "jobs" | "clients" | "txs" | "wallets";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "jobs", label: "Job" },
  { id: "clients", label: "Khách" },
  { id: "txs", label: "Thu chi" },
  { id: "wallets", label: "Ví" },
];

function currentMonth(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

export default function App() {
  const [month, setMonth] = useState(currentMonth);
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="relative min-h-screen bg-[#F4F7F4] text-[#111827]">
      <AmbientBackground />
      <header className="sticky top-0 z-10 border-b border-[#E2E8E0] bg-[#FAFBF9]/85 backdrop-blur">
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

      <main key={tab} className="page-in relative z-10 mx-auto max-w-3xl px-4 py-5">
        {tab === "overview" && <Dashboard month={month} />}
        {tab === "jobs" && <Projects />}
        {tab === "clients" && <Clients />}
        {tab === "txs" && <Transactions month={month} />}
        {tab === "wallets" && <Accounts />}
      </main>
    </div>
  );
}
