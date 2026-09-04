import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, downloadInvoicePdf } from "../api/client";
import type { Client, Project, ProjectStatus } from "../types";
import { useToast } from "../components/Toast";
import { formatVND } from "../components/Cards";

type Filter = "All" | ProjectStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "All", label: "Tất cả" },
  { id: "Doing", label: "Doing" },
  { id: "Done", label: "Done" },
  { id: "Paid", label: "Paid" },
];

function fmtDate(d?: string | null): string {
  if (!d) return "Chưa hẹn ngày";
  const [y, m, day] = d.split("-");
  return y && m && day ? `${day}/${m}/${y}` : d;
}

const inputCls =
  "w-full rounded-lg border border-[#E2E8E0] bg-white px-3 py-2 text-sm focus:border-[#16A34A] focus:outline-none";

export default function Projects() {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("Doing");
  const [jobs, setJobs] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [deadline, setDeadline] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const path = filter === "All" ? "/api/projects" : `/api/projects?status=${filter}`;
      const data = await apiGet<Project[]>(path);
      setJobs(data);
    } catch (e: unknown) {
      toast.error(e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    apiGet<Client[]>("/api/clients")
      .then(setClients)
      .catch(() => {});
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      toast.error("Chọn khách cho job");
      return;
    }
    setSaving(true);
    try {
      await apiPost<Project>("/api/projects", {
        clientId,
        title,
        price: Number(price),
        deadline: deadline || null,
      });
      toast.success("Đã thêm job");
      setClientId("");
      setTitle("");
      setPrice("");
      setDeadline("");
      setShowForm(false);
      load();
    } catch (err: unknown) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(job: Project, status: ProjectStatus) {
    try {
      await apiPut<Project>(`/api/projects/${job.id}`, {
        title: job.title,
        price: job.price,
        status,
        deadline: job.deadline,
      });
      toast.success(status === "Paid" ? "Đã Paid, thu nhập tự ghi nhận" : `Đã chuyển job sang ${status}`);
      load();
    } catch (e: unknown) {
      toast.error(e);
    }
  }

  async function handleInvoice(job: Project) {
    try {
      await downloadInvoicePdf(job.id);
      toast.success("Đã tải file PDF invoice");
    } catch (e: unknown) {
      toast.error(e);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              filter === f.id ? "bg-[#111827] text-white" : "text-[#64748B] hover:bg-slate-200/60 hover:text-[#111827]"
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="ml-auto rounded-full bg-[#16A34A] px-4 py-1.5 text-sm font-semibold text-white"
        >
          + Job
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-3 rounded-xl border border-[#E2E8E0] bg-white p-4">
          <label className="block">
            <span className="mb-1 block text-sm text-[#64748B]">Khách</span>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls} required>
              <option value="">— Chọn khách —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-[#64748B]">Tên job</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} required maxLength={200} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm text-[#64748B]">Giá (đ)</span>
              <input
                type="number"
                min="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputCls}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-[#64748B]">Deadline</span>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[#111827] py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Đang lưu…" : "Lưu job"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" aria-busy="true" />
      ) : jobs.length === 0 ? (
        <p className="rounded-xl border border-[#E2E8E0] bg-white p-6 text-center text-sm text-[#64748B]">
          Chưa có job nào ở mục này. Bấm + Job để thêm job đầu tiên.
        </p>
      ) : (
        <ul className="divide-y divide-[#E2E8E0] rounded-xl border border-[#E2E8E0] bg-white">
          {jobs.map((j) => (
            <li key={j.id} className="space-y-2 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[#111827]">{j.title}</div>
                  <div className="mt-0.5 text-xs text-[#64748B]">
                    {j.client?.name ?? "Khách lẻ"} · hạn {fmtDate(j.deadline)}
                  </div>
                </div>
                <div className="shrink-0 text-sm font-bold tabular-nums">{formatVND(j.price)}</div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={j.status}
                  onChange={(e) => handleStatus(j, e.target.value as ProjectStatus)}
                  aria-label={`Trạng thái của ${j.title}`}
                  className="rounded-lg border border-[#E2E8E0] bg-[#FAFBF9] px-2 py-1 text-sm"
                >
                  <option value="Doing">Doing</option>
                  <option value="Done">Done</option>
                  <option value="Paid">Paid</option>
                </select>
                {(j.status === "Done" || j.status === "Paid") && (
                  <button
                    type="button"
                    onClick={() => handleInvoice(j)}
                    className="rounded-lg border border-[#16A34A] px-3 py-1 text-sm font-semibold text-green-700"
                  >
                    Xuất invoice
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
