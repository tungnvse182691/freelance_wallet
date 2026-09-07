import { useLayoutEffect, useRef, useState } from "react";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Clients from "./pages/Clients";
import Accounts from "./pages/Accounts";
import Transactions from "./pages/Transactions";
import Notes from "./pages/Notes";
import { AmbientBackground } from "./components/Cards";

type Tab = "overview" | "jobs" | "clients" | "txs" | "wallets" | "notes";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "jobs", label: "Job" },
  { id: "clients", label: "Khách" },
  { id: "txs", label: "Thu chi" },
  { id: "wallets", label: "Ví" },
  { id: "notes", label: "Ghi chú" },
];

function currentMonth(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

export default function App() {
  const [month, setMonth] = useState(currentMonth);
  const [tab, setTab] = useState<Tab>("overview");
  const [pill, setPill] = useState({ left: 0, width: 0 });
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useLayoutEffect(() => {
    function measure() {
      const i = TABS.findIndex((t) => t.id === tab);
      const el = btnRefs.current[i];
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [tab]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.id === tab);
    const n = (i + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    setTab(TABS[n].id);
    btnRefs.current[n]?.focus();
  }

  return (
    <div className="relative min-h-screen bg-[#F4F7F4] text-[#111827]">
      <AmbientBackground />
      <header className="sticky top-0 z-20 border-b border-[#E2E8E0] bg-[#F4F7F4]/90 backdrop-blur-xl">
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
              className="rounded-full border border-[#E2E8E0] bg-white/80 px-3 py-1.5 text-sm shadow-sm backdrop-blur"
            />
          </div>
        </div>
        <nav
          className="relative mx-auto flex max-w-3xl gap-1 rounded-2xl border border-white/60 bg-white/70 px-1.5 py-1.5 shadow-[0_8px_24px_-12px_rgb(17_24_39/0.25),inset_0_1px_0_rgb(255_255_255/0.7)] backdrop-blur-xl"
          aria-label="Điều hướng"
          onKeyDown={onKeyDown}
        >
          <span
            aria-hidden="true"
            className="seg-pill absolute top-1.5 bottom-1.5 rounded-xl"
            style={{
              left: pill.left,
              width: pill.width,
              background: "linear-gradient(135deg, #1a2b22 0%, #111827 100%)",
              boxShadow:
                "0 6px 16px -6px rgb(20_83_45/0.55), inset 0 1px 0 rgb(255_255_255/0.15)",
            }}
          />
          {TABS.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`relative z-10 flex-1 rounded-xl px-2 py-2 text-sm font-medium transition-colors duration-200 ${
                tab === t.id ? "text-white" : "text-[#64748B] hover:text-[#111827]"
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
        {tab === "notes" && <Notes />}
      </main>
    </div>
  );
}
