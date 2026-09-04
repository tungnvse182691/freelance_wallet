import type { DashboardResponse } from "../types";

// Base URL from env only — never hardcode. See .env.example.
const BASE = import.meta.env.VITE_API_URL as string;

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "Lỗi mạng, thử lại" }));
    throw new Error((body as { message?: string }).message ?? "Lỗi không xác định");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const apiGet = <T>(p: string) => api<T>(p);
export const apiPost = <T>(p: string, b: unknown) => api<T>(p, { method: "POST", body: JSON.stringify(b) });
export const apiPut = <T>(p: string, b: unknown) => api<T>(p, { method: "PUT", body: JSON.stringify(b) });
export const apiDel = (p: string) => api<void>(p, { method: "DELETE" });

export const getDashboard = (month: string) => apiGet<DashboardResponse>(`/api/dashboard?month=${month}`);

export async function downloadInvoicePdf(projectId: string, code?: string): Promise<void> {
  const res = await fetch(`${BASE}/api/projects/${projectId}/invoice`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "Tạo invoice thất bại" }));
    throw new Error(body.message ?? "Tạo invoice thất bại");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${code ?? "invoice"}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
