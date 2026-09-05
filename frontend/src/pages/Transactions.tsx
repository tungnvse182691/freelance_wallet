import { useEffect, useRef, useState } from "react";
import { apiDel, apiGet, apiPost } from "../api/client";
import type { AccountBalance, BalancesResult, Project, TransactionRecord, TxType } from "../types";
import { useToast } from "../components/Toast";
import { formatVND } from "../components/Cards";

const inputCls =
  "w-full rounded-lg border border-[#E2E8E0] bg-white px-3 py-2 text-sm focus:border-[#16A34A] focus:outline-none";

function today(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function fmtDate(d: string): string {
  const [y, m, day] = d.split("-");
  return y && m && day ? `${day}/${m}/${y}` : d;
}

export default function Transactions({ month }: { month: string }) {
  const toast = useToast();
  const [list, setList] = useState<TransactionRecord[]>([]);
  const [jobs, setJobs] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<TxType>("Expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [projectId, setProjectId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const seeded = useRef(false);

  function pickDefault(list: AccountBalance[]) {
    setAccounts(list);
    setAccountId((cur) => cur || list[0]?.id || "");
  }

  useEffect(() => {
    apiGet<Project[]>("/api/projects")
      .then(setJobs)
      .catch(() => {});
    apiGet<BalancesResult>("/api/accounts")
      .then((d) => {
        if (d.balances.length === 0 && !seeded.current) {
          seeded.current = true;
          apiPost("/api/accounts", { name: "Ví chính", openingBalance: 0 })
            .then(() => apiGet<BalancesResult>("/api/accounts").then((r) => pickDefault(r.balances)))
            .catch(() => {});
        } else {
          pickDefault(d.balances);
        }
      })
      .catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    try {
      setList(await apiGet<TransactionRecord[]>(`/api/transactions?month=${month}`));
    } catch (e: unknown) {
      toast.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const suggestions = [...new Set(list.map((t) => (t.category ?? "").trim()).filter((c) => c !== ""))];
  const accountName = (id?: string | null) => accounts.find((a) => a.id === id)?.name;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost<TransactionRecord>("/api/transactions", {
        type,
        amount: Number(amount),
        date,
        projectId: projectId || null,
        accountId: accountId || null,
        category: category.trim() === "" ? null : category.trim(),
        note: note || null,
      });
      toast.success(type === "Income" ? "Đã ghi thu" : "Đã ghi chi");
      setType("Expense");
      setAmount("");
      setDate(today());
      setProjectId("");
      setCategory("");
      setNote("");
      setShowForm(false);
      load();
    } catch (err: unknown) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t: TransactionRecord) {
    if (!window.confirm("Xóa giao dịch này?")) return;
    try {
      await apiDel(`/api/transactions/${t.id}`);
      toast.success("Đã xóa giao dịch");
      load();
    } catch (e: unknown) {
      toast.error(e);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <h2 className="text-base font-bold text-[#111827]">
          Thu chi tháng {month.slice(5)}/{month.slice(0, 4)}{" "}
          {list.length > 0 && <span className="font-normal text-[#64748B]">({list.length})</span>}
        </h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="ml-auto rounded-full bg-[#16A34A] px-4 py-1.5 text-sm font-semibold text-white shadow-sm btn-press"
        >
          + Thu chi
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-3 rounded-xl border border-[#E2E8E0] bg-white p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm text-[#64748B]">Loại</span>
              <select value={type} onChange={(e) => setType(e.target.value as TxType)} className={inputCls}>
                <option value="Expense">Chi</option>
                <option value="Income">Thu</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-[#64748B]">Số tiền (đ)</span>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputCls}
                required
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm text-[#64748B]">Ngày</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} required />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-[#64748B]">Link job (tùy chọn)</span>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls}>
                <option value="">— Chi lẻ —</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm text-[#64748B]">Ví</span>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputCls}>
                <option value="">— Chưa chọn ví —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-[#64748B]">Mảng</span>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputCls}
                list="tx-categories"
                placeholder="Ăn uống, server…"
                maxLength={100}
              />
              <datalist id="tx-categories">
                {suggestions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm text-[#64748B]">Ghi chú</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="Tiền server, domain…" />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[#111827] py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Đang lưu…" : "Lưu giao dịch"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" aria-busy="true" />
      ) : list.length === 0 ? (
        <p className="rounded-xl border border-[#E2E8E0] bg-white p-6 text-center text-sm text-[#64748B]">
          Tháng này chưa có thu chi nào. Bấm + Thu chi để ghi khoản đầu tiên.
        </p>
      ) : (
        <ul className="divide-y divide-[#E2E8E0] rounded-xl border border-[#E2E8E0] bg-white">
          {list.map((t) => (
            <li
              key={t.id}
              className={`lift flex items-center gap-3 border-l-4 bg-white px-4 py-3 ${
                t.type === "Income" ? "border-l-[#16A34A]" : "border-l-[#DC2626]"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-bold text-[#111827]">
                  {t.note || (t.type === "Income" ? "Thu" : "Chi")}
                </div>
                <div className="mt-0.5 truncate text-xs text-[#64748B]">
                  {fmtDate(t.date)}
                  {t.category ? ` · ${t.category}` : ""}
                  {accountName(t.accountId) ? ` · ${accountName(t.accountId)}` : ""}
                </div>
              </div>
              <div
                className={`shrink-0 text-base font-bold tabular-nums ${
                  t.type === "Income" ? "text-green-700" : "text-red-700"
                }`}
              >
                {t.type === "Income" ? "+" : "−"}
                {formatVND(t.amount)}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(t)}
                aria-label={`Xóa giao dịch ${t.note ?? t.amount}`}
                className="shrink-0 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700"
              >
                Xóa
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

