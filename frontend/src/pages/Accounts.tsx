import { useEffect, useState } from "react";
import { apiDel, apiGet, apiPost } from "../api/client";
import type { AccountBalance, BalancesResult } from "../types";
import { useToast } from "../components/Toast";
import { formatVND } from "../components/Cards";

const inputCls =
  "w-full rounded-lg border border-[#E2E8E0] bg-white px-3 py-2 text-sm focus:border-[#16A34A] focus:outline-none";

export default function Accounts() {
  const toast = useToast();
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<BalancesResult>("/api/accounts");
      setBalances(data.balances);
      setTotal(data.total);
    } catch (e: unknown) {
      toast.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost<AccountBalance>("/api/accounts", {
        name,
        openingBalance: openingBalance === "" ? 0 : Number(openingBalance),
      });
      toast.success("Đã thêm ví");
      setName("");
      setOpeningBalance("");
      setShowForm(false);
      load();
    } catch (err: unknown) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(a: AccountBalance) {
    if (!window.confirm(`Xóa ví "${a.name}"?`)) return;
    try {
      await apiDel(`/api/accounts/${a.id}`);
      toast.success("Đã xóa ví");
      load();
    } catch (e: unknown) {
      toast.error(e);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <h2 className="text-base font-bold text-[#111827]">Ví của tôi</h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="ml-auto rounded-full bg-[#16A34A] px-4 py-1.5 text-sm font-semibold text-white shadow-sm btn-press"
        >
          + Ví
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-3 rounded-xl border border-[#E2E8E0] bg-white p-4">
          <label className="block">
            <span className="mb-1 block text-sm text-[#64748B]">Tên ví</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              required
              maxLength={200}
              placeholder="Tiền mặt, Vietcombank…"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-[#64748B]">Số dư đầu kỳ (đ)</span>
            <input
              type="number"
              min="0"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className={inputCls}
              placeholder="0"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[#111827] py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Đang lưu…" : "Lưu ví"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-[#111827] p-5 text-white">
            <div className="text-sm text-slate-300">Tổng tiền các ví</div>
            <div
              className="mt-1 font-bold tabular-nums"
              style={{ fontFamily: '"Be Vietnam Pro", Inter, system-ui, sans-serif', fontSize: "2rem", lineHeight: 1.1 }}
            >
              {formatVND(total)}
            </div>
          </div>

          {balances.length === 0 ? (
            <p className="rounded-xl border border-[#E2E8E0] bg-white p-6 text-center text-sm text-[#64748B]">
              Chưa có ví nào. Bấm + Ví để thêm ví đầu tiên.
            </p>
          ) : (
            <ul className="space-y-3">
              {balances.map((a, i) => (
                <li
                  key={a.id}
                  className="lift relative overflow-hidden rounded-2xl p-4 text-white"
                  style={{
                    background: `linear-gradient(135deg, ${["#14532D", "#0F766E", "#1E3A5F", "#3F3F46"][i % 4]} 0%, #111827 100%)`,
                  }}
                >
                  <div
                    aria-hidden="true"
                    className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute -bottom-12 right-16 h-24 w-24 rounded-full bg-white/5"
                  />
                  <div className="relative flex items-center gap-3">
                    <span aria-hidden="true" className="h-8 w-11 shrink-0 rounded-md bg-gradient-to-br from-amber-200 to-amber-400 opacity-90" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-300">{a.name}</div>
                      <div className="mt-0.5 text-xl font-bold tabular-nums">{formatVND(a.balance)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(a)}
                      className="btn-press shrink-0 rounded-lg border border-white/25 px-3 py-1 text-sm font-medium text-white/90 hover:bg-white/10"
                    >
                      Xóa
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

