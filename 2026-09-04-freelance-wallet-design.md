# Freelance Wallet — Design Spec (Ví Freelancer IT)

Ngày: 2026-09-04
Trạng thái: Chờ user review trước khi lên implementation plan
Repo folder: `D:\freelance-wallet` (nằm ngoài D:\opencode theo yêu cầu user)

## 1. Bối cảnh + Mục tiêu

User: dev backend C# chính, đá thêm React + React Native + Flutter, làm job freelance lẻ.
Pain: tiền job về lung tung, quên ai chưa trả, cuối tháng không biết lãi bao nhiêu, invoice gửi khách thiếu pro.

Mục tiêu MVP (1 user là chính user):
- Ghi job trong 10 giây, ghi thu/chi theo tháng/job/khách.
- Dashboard mở lên thấy ngay: tổng thu / chi / lãi tháng, job dở dang, ai nợ quá hạn.
- Bấm 1 nút từ job ra PDF invoice đẹp (logo + STK) gửi khách qua Zalo.
- Dùng hàng ngày, nhanh, đẹp, không cần thẻ, free dài lâu.
- Chừa cửa bán gói Pro/Team sau này, bê qua mobile (RN/Flutter) được.

Không làm ở MVP (YAGNI):
- Login team, phân quyền, share nhiều người.
- Đồng bộ ngân hàng, tính thuế tự động.
- AI (để phase 2, dùng BYOK Gemini/Groq để khỏi tốn token server).
- App mobile native (làm web responsive trước).

## 2. Kiến trúc chốt

- FE: `React + Vite + TypeScript + Tailwind` trong `D:\freelance-wallet\frontend`
  - Deploy: Vercel free (không cần thẻ).
  - Lý do: user đã biết React, Tailwind làm đẹp nhanh, Vite chạy nhẹ.
- BE: `ASP.NET Core 8 Web API + EF Core` trong `D:\freelance-wallet\backend`
  - Deploy Phase 1: chạy localhost (`dotnet run`), không deploy BE.
  - Deploy Phase 2 (khi cần online 24/7): Render Free hoặc máy có thẻ mới tính. Không bắt buộc cho MVP.
  - Lý do: đúng tủ C# của user, đi xin việc show được, QuestPDF gen invoice thuần C#.
- DB: `Supabase Free Postgres` (chốt, thay MySQL/SQLite)
  - Free: $0, 2 project, 500MB/project, 50k MAU, 5GB egress, không cần thẻ lúc tạo.
  - Giới hạn: pause sau 1 tuần không đụng (bấm Resume 1 click lên lại), không backup tự động, log 1 ngày.
  - Đối sách: data job bé (vài MB/năm), tuần export CSV 1 lần tay. Không bấm Upgrade Pro $25, không bật branching/compute addon.
  - Provider EF Core: `Npgsql.EntityFrameworkCore.PostgreSQL`. Code giống MySQL 95%, chỉ đổi provider + connection string.
- Auth MVP: 1 user cứng (single-user mode). Chưa làm JWT login đầy đủ để khỏi phức tạp. Phase 2 mới thêm Supabase Auth + JWT.
- PDF: `QuestPDF` (free, MIT, thuần C#) gen ở BE. Template 1 trang A5/A4.
- Logo: 1 logo SVG ví tiền + `</>`, 2 màu xanh lá (#16A34A) + đen (#111827). Dùng cho header web + in lên invoice.

```
React (Vercel) --REST JSON--> ASP.NET Core API (localhost Phase 1)
                                            |
                                         EF Core (Npgsql)
                                            |
                                   Supabase Postgres Free
```

## 3. Data model (4 bảng duy nhất)

### Clients
- Id (uuid, pk, default gen_random_uuid())
- Name (text, required, max 200)
- Phone (text, nullable) — lưu SĐT/Zalo
- Email (text, nullable)
- BankAccount (text, nullable) — STK để in invoice
- Note (text, nullable)
- CreatedAt (timestamptz, default now())
- Ràng buộc: xóa Client đang có Project thì chặn, báo rõ.

### Projects (Job)
- Id (uuid, pk)
- ClientId (uuid, fk -> Clients.Id, required)
- Title (text, required, ví dụ "Web bán hàng React + API C#")
- Price (numeric(18,2), > 0)
- Status (text: Doing | Done | Paid, default Doing)
- Deadline (date, nullable)
- CreatedAt (timestamptz, default now())
- Index: (Status, Deadline), (ClientId)

### Transactions (Thu/Chi)
- Id (uuid, pk)
- ProjectId (uuid, fk -> Projects.Id, nullable — thu từ job thì link, chi lẻ thì null)
- Type (text: Income | Expense)
- Amount (numeric(18,2), > 0)
- Date (date, required)
- Note (text, nullable)
- CreatedAt (timestamptz, default now())
- Index: (Date), (Type, Date)

### Invoices
- Id (uuid, pk)
- ProjectId (uuid, fk -> Projects.Id, unique 1 invoice/job ở MVP cho đơn giản, phase 2 cho nhiều)
- Code (text, unique, format INV-YYYY-001, tự tăng theo năm)
- IssuedAt (date, default today)
- PdfStorage (text, nullable — Phase 1 gen on-the-fly không lưu file, chỉ lưu Code để tải lại)
- Quy tắc gen Code: `INV-2026-001`, reset 001 mỗi năm, chống trùng bằng unique constraint + retry.

## 4. API contract (BE)

Base: `/api`. JSON. Lỗi chuẩn `{ "message": "...tiếng Việt..." }`.

- `GET /api/dashboard?month=2026-09`
  - Trả: `{ income, expense, profit, overdue: [{projectId, title, clientName, deadline, price}], doing: [...] }`
  - Tính ở BE bằng 2-3 query EF Core, FE chỉ hiển thị.
- `GET/POST /api/clients`, `GET/PUT/DELETE /api/clients/{id}`
- `GET/POST /api/projects?status=Doing`, `GET/PUT/DELETE /api/projects/{id}`
- `GET/POST /api/transactions?month=2026-09&type=Income`, `DELETE /api/transactions/{id}`
- `POST /api/projects/{id}/invoice` -> gen PDF QuestPDF, trả `application/pdf` download `INV-2026-001.pdf`
- `GET /api/invoices`, `GET /api/invoices/{code}/pdf` (tải lại)
- Validation: Title/Name required, Price/Amount > 0, Date không quá tương lai 1 năm. Sai trả 400 + message Việt.
- Global exception middleware: log ra console/file, không lộ stack trace ra ngoài. 404 trả message rõ. FE hiện toast.

## 5. FE flows (5 flow test tay)

1. Thêm job: Dashboard -> + Job -> chọn khách (hoặc + Khách nhanh) -> nhập giá/deadline -> lưu -> hiện ở Doing.
2. Ghi thu: vào Job -> Ghi thu -> Amount = Price mặc định -> lưu -> Job vẫn Done cho tới khi bấm Paid.
3. Tạo invoice: Job Done -> Tạo invoice -> preview PDF (logo + STK + bảng tiền) -> Tải -> gửi Zalo.
4. Đánh Paid: khách chuyển -> bấm Paid -> tự tạo Transaction Income + Dashboard cập nhật.
5. Ghi chi: + Chi (tiền server, domain) -> Dashboard lãi trừ ngay.
- Search/filter: theo tháng, khách, status. Mobile responsive (dùng được trên điện thoại khi đi gặp khách).

## 6. UI + Logo

- Style: Tailwind, dark-mode sau, MVP light sạch. Font Inter/Be Vietnam Pro cho tiếng Việt đẹp.
- Header: logo SVG + tên Freelance Wallet + tháng selector + nút + Job.
- Dashboard cards: Thu / Chi / Lãi + biểu đồ mini 6 tháng (Recharts, phase 2 cũng được, MVP dùng số + bar CSS cũng ok).
- Skill trong máy đã có `frontend-design` và `webapp-testing` — lúc code FE nhớ đọc 2 skill này để UI không xấu và biết cách test bằng Playwright.
- Invoice PDF: header logo + tên freelancer + SĐT/STK (lấy từ Settings/Profile 1 dòng), bảng job, tổng tiền VNĐ format `12.500.000 đ`, footer cảm ơn + mã INV.

## 7. Deploy + Vận hành không thẻ

- Phase 1 (hiện tại): BE localhost + Supabase cloud + FE Vercel. Không cần thẻ, không tốn phí.
  - Supabase: tạo project free, copy connection string, dán vào `backend/appsettings.json` (không commit key lên git, dùng User Secrets / env).
  - Vượt pause: tuần mở web 1 lần là không bao giờ pause. Nếu pause bấm Resume trong dashboard Supabase.
  - Backup: nút Export CSV (transactions + projects) trong Settings, tuần bấm 1 lần tải về máy.
- Phase 2 (khi có thẻ/tiền): mới tính Render/Azure/Oracle + domain riêng.

## 8. Testing

- BE xUnit (3 test bắt buộc vì liên quan tiền): tổng thu/chi/lãi theo tháng, phát hiện overdue (deadline < today && status != Paid), gen mã INV tăng dần + unique theo năm.
- FE: test tay 5 flows mục 5 + check responsive 390px. Dùng skill `webapp-testing` (Playwright) khi muốn test tự động sau.
- Tiêu chí pass MVP: nhập 5 job mẫu, số dashboard khớp tay tính, PDF mở được, xóa Client có job bị chặn đúng message.

## 9. Đường bán (không code giờ)

- Free: 30 job + 3 invoice/tháng.
- Pro ~49k/tháng: unlimited + nhắc đòi nợ + xuất Excel.
- Team: share kế toán. Chừa cột `OwnerId` sau này, giờ hardcode 1 user.

## 10. Chia việc cho 2 chat BE/FE + Checker

- Chat BE (ASP.NET Core + EF Core + QuestPDF + xUnit): làm `backend/` từ models mục 3 + API mục 4 + middleware lỗi + QuestPDF template. Không đụng FE.
- Chat FE (React + Vite + TS + Tailwind): làm `frontend/` gọi đúng API mục 4, Dashboard + CRUD + nút tải PDF (blob). Không tự bịa API mới.
- Chat này (checker): giữ spec này làm chuẩn, review chéo 2 bên, bắt lỗi lệch contract, check tiền tính đúng, PDF đẹp, không lộ key Supabase.
- Giao tiếp 2 chat: chỉ qua file spec này + `openapi.json` (BE xuất ra sau khi code xong endpoint, FE import dùng).

## 11. Rủi ro đã biết

- Supabase Free pause sau 1 tuần idle -> chấp nhận, có nút Resume + backup CSV.
- Render free sleep (nếu dùng sau) -> chấp nhận demo, data thật nằm Supabase nên không mất.
- Không thẻ -> không Oracle VM, không domain custom BE ở MVP. FE Vercel vẫn có domain free đủ xài.
