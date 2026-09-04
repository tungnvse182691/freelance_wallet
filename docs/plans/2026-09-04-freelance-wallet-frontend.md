# Freelance Wallet Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React UI for Freelance Wallet: dashboard with monthly totals + overdue badges, Client/Project/Transaction CRUD, one-click invoice PDF download, logo + Vercel deploy.

**Architecture:** Single-page app, no router library (tab navigation by state to stay lean). One typed API client talks to the BE contract; pages render server-computed numbers and never recompute money locally.

**Tech Stack:** React 18 + Vite + TypeScript (strict) + Tailwind CSS. No UI kit — hand-rolled cards keep the bundle small.

**Spec:** `D:\freelance-wallet\2026-09-04-freelance-wallet-design.md` (FE flows §5, UI §6). **BE contract:** `D:\freelance-wallet\docs\plans\2026-09-04-freelance-wallet-backend.md` Task 3–4 (exact routes + error shape). **Skill:** load `frontend-design` before Task 3.

## Global Constraints

- API base URL from env only: `VITE_API_URL` (local `http://localhost:5000`, prod Render/BE URL). Never hardcoded in components.
- Types mirror the BE contract exactly: `Doing | Done | Paid`, `Income | Expense`, error `{ message: string }`.
- Money displayed with `Intl.NumberFormat("vi-VN")` + `đ`; FE never computes totals — dashboard numbers come from `GET /api/dashboard`.
- Every failed request shows the server's `message` in a toast; no silent failures, no raw stack display.
- Mobile-first: usable at 390px width (test in devtools).
- Work only inside `D:\freelance-wallet\frontend`. Do not touch `backend/`. Do not invent new API routes — if one is missing, stop and report to the checker chat.

---

## File Structure

```
D:\freelance-wallet\frontend\
  package.json / vite.config.ts / tailwind.config.js / tsconfig.json
  .env.example               # VITE_API_URL=http://localhost:5000
  src/main.tsx / index.css   # tailwind directives + font
  src/types.ts               # Client, Project, Transaction, Invoice, DashboardResponse
  src/api/client.ts          # api() helper + list/create/update/remove + dashboard + invoicePdf
  src/components/Toast.tsx   # toast context (success/error)
  src/components/Cards.tsx   # StatCard, Badge
  src/pages/Dashboard.tsx
  src/pages/Clients.tsx
  src/pages/Projects.tsx
  src/pages/Transactions.tsx
  src/App.tsx                # header (logo.svg + month picker + tabs) + tab switch
  public/logo.svg            # wallet + </> logo, #16A34A + #111827
```

---

### Task 1: Scaffold + typed API client (build must pass)

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `src/main.tsx`, `src/index.css`, `src/types.ts`, `src/api/client.ts`, `.env.example`
- Test: `npm run build` (type + bundle gate)

**Interfaces:**
- Consumes: BE routes from backend plan (Task 3–4)
- Produces: `api(path, options)`, `apiGet/post/put/del`, `getDashboard(month)`, `createInvoicePdf(projectId) -> Blob`; types `Client`, `Project`, `TransactionRecord`, `DashboardResponse`, `ApiError`

- [ ] **Step 1: Scaffold**

Run:
```bash
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```
Expected: `vite.config.ts` + `package.json` exist. If scaffolding inside a non-empty folder complains, scaffold to a temp dir and move files in.

- [ ] **Step 2: Tailwind + strict TS config**

`tailwind.config.js` content: `['./index.html','./src/**/*.{ts,tsx}']`, `src/index.css` with the three `@tailwind` directives + `body { font-family: Inter, 'Be Vietnam Pro', system-ui, sans-serif; }`. `tsconfig.json`: `"strict": true, "noUnusedLocals": true`.

- [ ] **Step 3: Write exact types (mirror BE, no extras)**

`src/types.ts`:
```ts
export type ProjectStatus = "Doing" | "Done" | "Paid";
export type TxType = "Income" | "Expense";
export interface Client { id: string; name: string; phone?: string | null; email?: string | null; bankAccount?: string | null; note?: string | null; }
export interface Project { id: string; clientId: string; title: string; price: number; status: ProjectStatus; deadline?: string | null; client?: Client | null; }
export interface TransactionRecord { id: string; projectId?: string | null; type: TxType; amount: number; date: string; note?: string | null; }
export interface OverdueItem { projectId: string; title: string; clientName: string; deadline?: string | null; price: number; }
export interface DashboardResponse { income: number; expense: number; profit: number; overdue: OverdueItem[]; doing: { id: string; title: string; clientName: string; deadline?: string | null; price: number }[]; }
export interface ApiError { message: string; }
```

- [ ] **Step 4: Write the single API client (all fetch goes through here)**

`src/api/client.ts`:
```ts
import type { DashboardResponse } from "../types";
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
  a.href = url; a.download = `${code ?? "invoice"}.pdf`; a.click();
  URL.revokeObjectURL(url);
}
```

`.env.example`:
```
VITE_API_URL=http://localhost:5000
```

- [ ] **Step 5: Build to verify**

Run: `npm run build`
Expected: `✓ built` with 0 TS errors.

- [ ] **Step 6: Commit**

```bash
git add frontend
git commit -m "feat(fe): scaffold, types, api client"
```

---

### Task 2: App shell + Dashboard (the daily screen)

**Files:**
- Create: `src/components/Toast.tsx`, `src/components/Cards.tsx`, `src/pages/Dashboard.tsx`, `src/App.tsx`, `public/logo.svg`
- Modify: `src/main.tsx` (wrap ToastProvider + App)

**Interfaces:**
- Consumes: `getDashboard`, types from Task 1
- Produces: `App` with month state shared to Dashboard; `Toast` context `toast.success(msg) / toast.error(err)`

- [ ] **Step 1: Toast + stat cards**

`src/components/Toast.tsx`: React context holding `{ msg, kind } | null`, auto-dismiss 3s, fixed bottom, green/red. Expose `useToast()` returning `{ success(m: string), error(e: unknown) }` where error extracts `e.message`.

`src/components/Cards.tsx`:
```tsx
export function StatCard({ label, value, tone }: { label: string; value: number; tone: "green" | "red" | "dark" }) {
  const color = tone === "green" ? "text-green-600" : tone === "red" ? "text-red-600" : "text-gray-900";
  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{new Intl.NumberFormat("vi-VN").format(value)} đ</div>
    </div>
  );
}
export function OverdueBadge() {
  return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Quá hạn</span>;
}
```

- [ ] **Step 2: Logo**

`public/logo.svg`: rounded wallet rect in `#16A34A`, dark `#111827` `</>` glyph centered, 32×32 viewBox. Keep single file, no gradients (prints clean on invoice header reference).

- [ ] **Step 3: Dashboard page**

`src/pages/Dashboard.tsx`: props `{ month: string }`. On mount/month change calls `getDashboard(month)`; loading skeleton (3 gray cards), error → `toast.error`. Renders: 3 `StatCard` (Thu/Chi/Lãi), overdue list (title + clientName + deadline + price + `OverdueBadge`), doing list (title + client + deadline + price). Never computes totals locally.

- [ ] **Step 4: App shell**

`src/App.tsx`: header with `<img src="/logo.svg">` + "Freelance Wallet", `<input type="month">` bound to state defaulting to current `yyyy-MM`, tab buttons (Tổng quan / Job / Khách / Thu chi) switching pages by state. No router.

- [ ] **Step 5: Verify against live BE**

Run: `npm run dev` with BE running (`dotnet run --project D:\freelance-wallet\backend\src\Api`) and seeded month data. Check: cards match BE JSON, overdue badge shows only for past-deadline unpaid, `npm run build` passes.
Expected: visual match + 0 build errors.

- [ ] **Step 6: Commit**

```bash
git add frontend
git commit -m "feat(fe): app shell, dashboard, logo"
```

---

### Task 3: Job + Client + Thu/Chi pages (CRUD + Paid flow + invoice button)

**Files:**
- Create: `src/pages/Projects.tsx`, `src/pages/Clients.tsx`, `src/pages/Transactions.tsx`
- Modify: `src/App.tsx` (wire the three tabs)

**Interfaces:**
- Consumes: `apiGet/Post/Put/Del`, `downloadInvoicePdf`, Toast
- Produces: working CRUD bound to BE validation messages; Paid flow; invoice download

- [ ] **Step 1: Projects page (core daily flow)**

`src/pages/Projects.tsx`: list from `apiGet<Project[]>("/api/projects?status=" + filter)` with filter buttons Tất cả/Doing/Done/Paid. Add-job form (client select from `/api/clients`, title, price, deadline) → `apiPost("/api/projects")`, server message on error. Row actions: status select → `apiPut("/api/projects/{id}", {title, price, status, deadline})`; setting `Paid` auto-creates the Income transaction server-side (no FE second call). "Xuất invoice" button per Done/Paid job → `downloadInvoicePdf(id)` → toast `"Đã tải {code}.pdf"` (catch: toast.error).

- [ ] **Step 2: Clients page**

`src/pages/Clients.tsx`: list + add form (name required, phone/email/STK/note optional) → `apiPost("/api/clients")`. Delete with `confirm("Xóa khách này?")` → `apiDel`; server refusal (`"Khách hàng còn job..."`) surfaces via toast — do not pre-check in FE.

- [ ] **Step 3: Transactions page**

`src/pages/Transactions.tsx`: month-filtered list `apiGet<...("/api/transactions?month=" + month)` (month prop from App), add form (type select Thu/Chi, amount, date, optional project link, note) → `apiPost`. Delete with confirm. Amount input `type="number" min="1"`.

- [ ] **Step 4: Full 5-flow manual test (spec §5)**

With BE + Supabase running: (1) add job → appears in Doing; (2) record income → dashboard updates; (3) create invoice → PDF downloads and opens; (4) mark Paid → dashboard profit correct; (5) add expense → profit drops. Check 390px width in devtools — no horizontal scroll, buttons tappable.
Expected: all 5 pass; any failure is a bug report to the checker chat with exact server message.

- [ ] **Step 5: Build + commit**

Run: `npm run build` (0 errors).
```bash
git add frontend
git commit -m "feat(fe): projects, clients, transactions, invoice download"
```

---

### Task 4: Polish + Vercel deploy

**Files:**
- Create: `vercel.json` (if needed), `frontend/README.md` (run + deploy notes)
- Modify: minor UI fixes only — no new features in this task

**Interfaces:**
- Consumes: everything above
- Produces: public Vercel URL with `VITE_API_URL` pointing at the BE; README with setup

- [ ] **Step 1: README**

`frontend/README.md`: `npm install`, `cp .env.example .env`, set `VITE_API_URL`, `npm run dev`, `npm run build`; Vercel steps (import repo, set env `VITE_API_URL`, deploy). Note: BE runs on localhost in Phase 1, so Vercel preview calls local BE only if tunneled — record the limitation honestly.

- [ ] **Step 2: Polish pass (load `frontend-design` skill first)**

Empty states ("Chưa có job nào — thêm job đầu tiên"), loading skeletons on all pages, Vietnamese copy check (no English leftovers except code terms), tab order logical. Fix only; no new pages.

- [ ] **Step 3: Production build + deploy**

Run: `npm run build`. Then Vercel import + env + deploy.
Expected: build clean, public URL renders header + dashboard (data appears once BE is reachable).

- [ ] **Step 4: Commit**

```bash
git add frontend
git commit -m "chore(fe): readme, polish, vercel deploy"
```
