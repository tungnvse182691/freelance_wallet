import { useEffect, useState } from "react";
import { apiDel, apiGet, apiPost, apiPut } from "../api/client";
import type { NoteRecord } from "../types";
import { useToast } from "../components/Toast";

const inputCls =
  "w-full rounded-lg border border-[#E2E8E0] bg-white px-3 py-2 text-sm focus:border-[#16A34A] focus:outline-none";

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => `${n}`.padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function Notes() {
  const toast = useToast();
  const [list, setList] = useState<NoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setList(await apiGet<NoteRecord[]>("/api/notes"));
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

  function resetForm() {
    setTitle("");
    setContent("");
    setEditingId(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim() === "") {
      toast.error("Nhập tiêu đề ghi chú");
      return;
    }
    setSaving(true);
    try {
      const body = { title: title.trim(), content: content === "" ? null : content };
      if (editingId) {
        await apiPut<NoteRecord>(`/api/notes/${editingId}`, body);
        toast.success("Đã sửa ghi chú");
      } else {
        await apiPost<NoteRecord>("/api/notes", body);
        toast.success("Đã lưu ghi chú");
      }
      resetForm();
      setShowForm(false);
      load();
    } catch (err: unknown) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(n: NoteRecord) {
    setTitle(n.title);
    setContent(n.content ?? "");
    setEditingId(n.id);
    setShowForm(true);
  }

  async function handleDelete(n: NoteRecord) {
    if (!window.confirm("Xóa ghi chú này?")) return;
    try {
      await apiDel(`/api/notes/${n.id}`);
      toast.success("Đã xóa ghi chú");
      load();
    } catch (e: unknown) {
      toast.error(e);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <h2 className="text-base font-bold text-[#111827]">
          Ghi chú{" "}
          {list.length > 0 && <span className="font-normal text-[#64748B]">({list.length})</span>}
        </h2>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm((v) => !v);
          }}
          className="ml-auto rounded-full bg-[#16A34A] px-4 py-1.5 text-sm font-semibold text-white shadow-sm btn-press"
        >
          + Ghi chú
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="space-y-3 rounded-xl border border-[#E2E8E0] bg-white p-4">
          {editingId ? <p className="text-sm font-semibold text-[#111827]">Đang sửa ghi chú</p> : null}
          <label className="block">
            <span className="mb-1 block text-sm text-[#64748B]">Tiêu đề</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              placeholder="VD: Ý tưởng job mới, việc cần đòi nợ…"
              maxLength={200}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-[#64748B]">Nội dung</span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`${inputCls} min-h-24 resize-y`}
              placeholder="Ghi gì cũng được, không dính tiền…"
              rows={4}
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[#111827] py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Đang lưu…" : "Lưu ghi chú"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" aria-busy="true" />
      ) : list.length === 0 ? (
        <p className="rounded-xl border border-[#E2E8E0] bg-white p-6 text-center text-sm text-[#64748B]">
          Chưa có ghi chú nào. Bấm + Ghi chú để ghi dòng đầu tiên.
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((n) => (
            <li
              key={n.id}
              className="lift rounded-xl border border-[#E2E8E0] border-l-4 border-l-[#16A34A] bg-white px-4 py-3"
            >
              <div className="text-[15px] font-bold text-[#111827]">{n.title}</div>
              {n.content ? (
                <div className="mt-1 whitespace-pre-wrap break-words text-sm text-[#334155]">{n.content}</div>
              ) : null}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-[#64748B]">{fmtDateTime(n.updatedAt)}</span>
                <span className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(n)}
                    aria-label={`Sửa ghi chú ${n.title}`}
                    className="shrink-0 rounded-lg border border-[#E2E8E0] px-2 py-1 text-xs font-medium text-[#111827] hover:bg-slate-100"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(n)}
                    aria-label={`Xóa ghi chú ${n.title}`}
                    className="shrink-0 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700"
                  >
                    Xóa
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
