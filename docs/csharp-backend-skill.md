---
name: csharp-backend
description: "Use this skill any time you write, review, or debug C# backend code — ASP.NET Core Web API, Entity Framework Core, or xUnit tests. Covers controller/DTO/service layout, EF Core migrations and queries (Npgsql/Postgres/Supabase and MySQL/SQLite), validation with Vietnamese error messages, global exception middleware, JWT auth when needed, QuestPDF invoice generation, and money-math testing. Trigger whenever the task touches a .csproj, Controller, DbContext, migration, or xUnit test — especially in the Freelance Wallet project (D:\\freelance-wallet\\backend). Do NOT use for frontend React/TypeScript work or for database administration outside the app's code."
---

# C# Backend (ASP.NET Core + EF Core + xUnit)

Project layout for `D:\freelance-wallet\backend`:

```
backend/
  src/Api/            # Controllers, Program.cs, middleware, DTOs
  src/Domain/         # Entities (Client, Project, Transaction, Invoice)
  src/Infrastructure/ # DbContext, migrations, repositories, QuestPDF templates
  tests/Api.Tests/    # xUnit: money math, overdue logic, invoice codes
```

## Commands

```bash
dotnet --version                    # need SDK 8+
dotnet new webapi -n Api            # scaffold only if folder is empty
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package QuestPDF
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet ef migrations add Initial --project src/Infrastructure --startup-project src/Api
dotnet ef database update --project src/Infrastructure --startup-project src/Api
dotnet test
dotnet run --project src/Api
```

## Rules for every output

- **Money uses `decimal`, never `double`/`float`.** DB column `numeric(18,2)`. Format VNĐ with `vi-VN` culture (`12.500.000 đ`).
- **IDs are `Guid` (uuid).** Generate server-side with `Guid.NewGuid()`, never trust client IDs on POST.
- **Thin controllers, logic in services.** Controllers validate + map DTOs only. Dashboard totals, overdue detection, and `INV-YYYY-NNN` code generation live in services so xUnit can test them without HTTP.
- **Error contract is fixed:** `{ "message": "<tiếng Việt>" }` with 400 for validation, 404 for missing, 500 generic. Never leak stack traces or connection strings to the client. Global exception middleware handles the rest.
- **Validation messages in Vietnamese.** `Price must be > 0` → `"Giá phải lớn hơn 0"`. Deleting a Client with Projects is blocked with a clear message.
- **Invoice codes are unique per year:** `INV-2026-001`, DB unique constraint on `Code`, retry on conflict. One invoice per project in MVP (unique on `ProjectId`).
- **Status values are exact strings:** `Doing | Done | Paid`, `Income | Expense`. Use constants/enums with string conversion, no magic strings scattered in code.
- **Overdue rule (single definition):** `Deadline < today && Status != Paid`. Implement once in a service, reuse in dashboard + tests.

## EF Core + Supabase (Npgsql) gotchas

- Connection string comes from env/User Secrets, **never hardcoded, never committed, never pasted into a free-model chat** (free-tier prompts may be used for training). Shape: `Host=...supabase.co;Port=5432;Database=postgres;Username=postgres;Password=...;Ssl Mode=Require;Trust Server Certificate=true`.
- Supabase Postgres needs `Ssl Mode=Require`. Direct (non-pooled) connection on port 5432 for migrations; the pooler URL (port 6543) is for runtime if provided.
- `DateTime` must be UTC: use `DateTime.UtcNow` / `timestamptz`. Never `DateTime.Now` in entities.
- Apply migrations at startup in production-like environments (`db.Database.Migrate()`), since free hosts give no interactive shell for `dotnet ef`.
- Free Supabase pauses after 1 week idle and has no auto-backups — the app must have an Export CSV endpoint for manual backup (see spec section 7).

## QuestPDF notes

- Community license is free for most uses — check current QuestPDF licensing if the project becomes commercial.
- Invoice template: 1 page, header logo SVG + freelancer name/phone/STK (from a single Profile/Settings source), job table, VNĐ totals, footer with invoice code. Generate on demand in `POST /api/projects/{id}/invoice`, return `application/pdf`.
- Keep the template in `src/Infrastructure/Pdf/` so it is testable without a web host.

## xUnit — the 3 mandatory tests (money is load-bearing)

1. Monthly totals: given mixed Income/Expense transactions, `income - expense == profit` exactly in `decimal`.
2. Overdue detection: project with past deadline + `Done` status appears; `Paid` does not.
3. Invoice code: sequential per year (`INV-2026-001` → `002`), resets on year change, no duplicates under retry.

Run `dotnet test` before claiming any BE work is done. A green build with wrong totals is still a failure — assert against hand-computed fixtures from the spec.
