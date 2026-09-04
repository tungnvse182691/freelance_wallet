import { useEffect, useState } from "react";
import { apiDel, apiGet, apiPost } from "../api/client";
import type { Client } from "../types";
import { useToast } from "../components/Toast";

const inputCls =
  "w-full rounded-lg border border-[#E2E8E0] bg-white px-3 py-2 text-sm focus:border-[#16A34A] focus:outline-none";

export default function Clients() {
  const toast = useToast();
  const [list, setList] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    setLoading(true);
    try {
      setList(await apiGet<Client[]>("/api/clients"));
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
      await apiPost<Client>("/api/clients", {
        name,
        phone: phone || null,
        email: email || null,
        bankAccount: bankAccount || null,
        note: note || null,
      });
      toast.success("Đã thêm khách");
      setName("");
      setPhone("");
      setEmail("");
      setBankAccount("");
      setNote("");
      setShowForm(false);
      load();
    } catch (err: unknown) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Client) {
    if (!window.confirm("Xóa khách này?")) return;
    try {
      await apiDel(`/api/clients/${c.id}`);
      toast.success("Đã xóa khách");
      load();
    } catch (e: unknown) {
      toast.error(e);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <h2 className="text-base font-bold text-[#111827]">
          Khách hàng {list.length > 0 && <span className="font-normal text-[#64748B]">({list.length})</span>}
        </h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="ml-auto rounded-full bg-[#16A34A] px-4 py-1.5 text-sm font-semibold text-white"
        >
          + Khách
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-3 rounded-xl border border-[#E2E8E0] bg-white p-4">
          <label className="block">
            <span className="mb-1 block text-sm text-[#64748B]">Tên khách</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} required maxLength={200} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm text-[#64748B]">SĐT / Zalo</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-[#64748B]">Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm text-[#64748B]">STK (in lên invoice)</span>
            <input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-[#64748B]">Ghi chú</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[#111827] py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Đang lưu…" : "Lưu khách"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" aria-busy="true" />
      ) : list.length === 0 ? (
        <p className="rounded-xl border border-[#E2E8E0] bg-white p-6 text-center text-sm text-[#64748B]">
          Chưa có khách nào. Bấm + Khách để thêm khách đầu tiên.
        </p>
      ) : (
        <ul className="divide-y divide-[#E2E8E0] rounded-xl border border-[#E2E8E0] bg-white">
          {list.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[#111827]">{c.name}</div>
                <div className="mt-0.5 truncate text-xs text-[#64748B]">
                  {[c.phone, c.email].filter(Boolean).join(" · ") || "Chưa có liên lạc"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(c)}
                className="shrink-0 rounded-lg border border-red-200 px-3 py-1 text-sm font-medium text-red-700"
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
