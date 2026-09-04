# Freelance Wallet Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the ASP.NET Core 8 Web API for Freelance Wallet: 4 entities, dashboard aggregates, CRUD, QuestPDF invoice endpoint, CSV export, xUnit money tests.

**Architecture:** Thin controllers → services (dashboard math, invoice codes) → EF Core (Npgsql) → Supabase Postgres Free. Services hold all money logic so xUnit tests them without HTTP.

**Tech Stack:** .NET 8 SDK, ASP.NET Core Web API, EF Core + Npgsql.EntityFrameworkCore.PostgreSQL, QuestPDF, xUnit.

**Spec:** `D:\freelance-wallet\2026-09-04-freelance-wallet-design.md` (+ skill: `D:\freelance-wallet\docs\csharp-backend-skill.md` — read both before Task 1).

## Global Constraints

- Money is `decimal` mapped to `numeric(18,2)`; never `double`/`float`.
- IDs are server-generated `Guid`; POST bodies never supply IDs.
- Error contract is exactly `{ "message": "<tiếng Việt>" }`: 400 validation, 404 missing, 500 generic; no stack traces or connection strings leave the server.
- Status strings are exactly `Doing | Done | Paid` and `Income | Expense` (constants only).
- Overdue rule (single definition): `Deadline < today && Status != Paid`.
- Invoice codes are `INV-YYYY-NNN`, unique DB constraint, reset yearly.
- All timestamps UTC (`DateTime.UtcNow`, `timestamptz`).
- Supabase connection string from env/User Secrets only; `Ssl Mode=Require`. Never committed, never pasted into chat.
- Work only inside `D:\freelance-wallet\backend`. Do not touch `frontend/`.

---

## File Structure

```
D:\freelance-wallet\backend\
  FreelanceWallet.sln
  src/Domain/Domain.csproj
    Entities/Client.cs          # Client entity
    Entities/Project.cs         # Project entity + status constants
    Entities/Transaction.cs     # Transaction entity + type constants
    Entities/Invoice.cs         # Invoice entity
  src/Infrastructure/Infrastructure.csproj
    AppDbContext.cs             # DbSets + Fluent config (numeric, unique, timestamptz)
    Migrations/                 # EF migrations (generated)
  src/Api/Api.csproj
    Program.cs                  # DI, Npgsql, middleware, Migrate() at startup
    appsettings.json            # ConnectionStrings:DefaultConnection = "__ENV__"
    DTOs/Dtos.cs                # CreateClientDto, CreateProjectDto, CreateTransactionDto, DashboardDto
    Services/DashboardService.cs
    Services/InvoiceCodeService.cs
    Controllers/ClientsController.cs
    Controllers/ProjectsController.cs
    Controllers/TransactionsController.cs
    Controllers/DashboardController.cs
    Controllers/InvoicesController.cs
    Controllers/ExportController.cs
    Middleware/ExceptionMiddleware.cs
    Pdf/InvoiceTemplate.cs      # QuestPDF template
  tests/Domain.Tests/Domain.Tests.csproj
    DashboardTests.cs
    InvoiceCodeTests.cs
```

---

### Task 1: Solution + Domain entities + DbContext (build must go green)

**Files:**
- Create: `FreelanceWallet.sln`, `src/Domain/Domain.csproj`, `src/Domain/Entities/*.cs` (4 files), `src/Infrastructure/Infrastructure.csproj`, `src/Infrastructure/AppDbContext.cs`, `src/Api/Api.csproj`, `src/Api/Program.cs`, `src/Api/appsettings.json`
- Test: `dotnet build` (compile gate for this task)

**Interfaces:**
- Consumes: nothing (first task)
- Produces: `AppDbContext` with `DbSet<Client> Clients`, `DbSet<Project> Projects`, `DbSet<Transaction> Transactions`, `DbSet<Invoice> Invoices`; entity namespaces `FreelanceWallet.Domain.Entities`

- [ ] **Step 1: Scaffold solution and projects**

Run:
```bash
dotnet new sln -n FreelanceWallet
dotnet new classlib -n Domain -o src/Domain
dotnet new classlib -n Infrastructure -o src/Infrastructure
dotnet new webapi -n Api -o src/Api --no-https
dotnet sln add src/Domain/Domain.csproj src/Infrastructure/Infrastructure.csproj src/Api/Api.csproj
dotnet add src/Infrastructure/Infrastructure.csproj reference src/Domain/Domain.csproj
dotnet add src/Api/Api.csproj reference src/Domain/Domain.csproj src/Infrastructure/Infrastructure.csproj
dotnet add src/Infrastructure/Infrastructure.csproj package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add src/Api/Api.csproj package Microsoft.EntityFrameworkCore.Design
```
Expected: all commands exit 0.

- [ ] **Step 2: Write the four entities**

`src/Domain/Entities/Client.cs`:
```csharp
namespace FreelanceWallet.Domain.Entities;

public class Client
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? BankAccount { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Project> Projects { get; set; } = new List<Project>();
}
```

`src/Domain/Entities/Project.cs`:
```csharp
namespace FreelanceWallet.Domain.Entities;

public static class ProjectStatuses
{
    public const string Doing = "Doing";
    public const string Done = "Done";
    public const string Paid = "Paid";
}

public class Project
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClientId { get; set; }
    public Client? Client { get; set; }
    public string Title { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Status { get; set; } = ProjectStatuses.Doing;
    public DateOnly? Deadline { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsOverdue(DateOnly today) =>
        Deadline.HasValue && Deadline.Value < today && Status != ProjectStatuses.Paid;
}
```

`src/Domain/Entities/Transaction.cs`:
```csharp
namespace FreelanceWallet.Domain.Entities;

public static class TransactionTypes
{
    public const string Income = "Income";
    public const string Expense = "Expense";
}

public class Transaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? ProjectId { get; set; }
    public Project? Project { get; set; }
    public string Type { get; set; } = TransactionTypes.Income;
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

`src/Domain/Entities/Invoice.cs`:
```csharp
namespace FreelanceWallet.Domain.Entities;

public class Invoice
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }
    public string Code { get; set; } = string.Empty;
    public DateOnly IssuedAt { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
}
```

- [ ] **Step 3: Write AppDbContext with exact column config**

`src/Infrastructure/AppDbContext.cs`:
```csharp
using FreelanceWallet.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FreelanceWallet.Infrastructure;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Invoice> Invoices => Set<Invoice>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Project>(e =>
        {
            e.Property(p => p.Price).HasColumnType("numeric(18,2)");
            e.HasIndex(p => new { p.Status, p.Deadline });
        });
        b.Entity<Transaction>(e =>
        {
            e.Property(t => t.Amount).HasColumnType("numeric(18,2)");
            e.HasIndex(t => t.Date);
        });
        b.Entity<Invoice>(e =>
        {
            e.HasIndex(i => i.Code).IsUnique();
            e.HasIndex(i => i.ProjectId).IsUnique();
        });
        foreach (var et in b.Model.GetEntityTypes())
            foreach (var p in et.GetProperties().Where(p => p.ClrType == typeof(DateTime)))
                p.SetColumnType("timestamptz");
    }
}
```

- [ ] **Step 4: Minimal Program.cs + placeholder connection string**

`src/Api/Program.cs`:
```csharp
using FreelanceWallet.Infrastructure;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
var app = builder.Build();
app.MapControllers();
app.Run();
```

`src/Api/appsettings.json`:
```json
{
  "ConnectionStrings": { "DefaultConnection": "__ENV__" },
  "Logging": { "LogLevel": { "Default": "Information" } }
}
```
Real value goes in env var `ConnectionStrings__DefaultConnection` or User Secrets — never in this file.

- [ ] **Step 5: Build to verify green**

Run: `dotnet build FreelanceWallet.sln`
Expected: `Build succeeded. 0 errors`.

- [ ] **Step 6: Commit**

```bash
git add backend
git commit -m "feat(be): solution, domain entities, AppDbContext"
```

---

### Task 2: DashboardService with TDD (money math + overdue)

**Files:**
- Create: `src/Api/Services/DashboardService.cs`, `src/Api/DTOs/Dtos.cs` (DashboardDto + OverdueItemDto), `tests/Domain.Tests/Domain.Tests.csproj`, `tests/Domain.Tests/DashboardTests.cs`
- Modify: `FreelanceWallet.sln` (add test project)

**Interfaces:**
- Consumes: `Project.IsOverdue`, `Transaction` entity
- Produces: `DashboardService.Compute(IEnumerable<Transaction> txs, int year, int month) -> (decimal income, decimal expense, decimal profit)`; `DashboardService.FindOverdue(IEnumerable<Project> projects, DateOnly today) -> IReadOnlyList<OverdueItemDto>`

- [ ] **Step 1: Scaffold test project + write failing tests**

Run: `dotnet new xunit -n Domain.Tests -o tests/Domain.Tests; dotnet sln add tests/Domain.Tests/Domain.Tests.csproj; dotnet add tests/Domain.Tests/Domain.Tests.csproj reference src/Domain/Domain.csproj src/Api/Api.csproj`

`tests/Domain.Tests/DashboardTests.cs`:
```csharp
using FreelanceWallet.Api.Services;
using FreelanceWallet.Domain.Entities;

public class DashboardTests
{
    [Fact]
    public void Compute_MixedMonth_ReturnsExactDecimalTotals()
    {
        var txs = new[]
        {
            new Transaction { Type = TransactionTypes.Income, Amount = 12_500_000m, Date = new DateOnly(2026, 9, 5) },
            new Transaction { Type = TransactionTypes.Income, Amount = 3_000_000m, Date = new DateOnly(2026, 9, 20) },
            new Transaction { Type = TransactionTypes.Expense, Amount = 500_000m, Date = new DateOnly(2026, 9, 2) },
            new Transaction { Type = TransactionTypes.Income, Amount = 99m, Date = new DateOnly(2026, 8, 1) },
        };
        var (income, expense, profit) = DashboardService.Compute(txs, 2026, 9);
        Assert.Equal(15_500_000m, income);
        Assert.Equal(500_000m, expense);
        Assert.Equal(15_000_000m, profit);
    }

    [Fact]
    public void FindOverdue_OnlyUnpaidPastDeadline()
    {
        var today = new DateOnly(2026, 9, 4);
        var projects = new[]
        {
            new Project { Title = "A", Status = ProjectStatuses.Doing, Deadline = new DateOnly(2026, 9, 1) },
            new Project { Title = "B", Status = ProjectStatuses.Paid, Deadline = new DateOnly(2026, 8, 1) },
            new Project { Title = "C", Status = ProjectStatuses.Doing, Deadline = new DateOnly(2026, 10, 1) },
        };
        var result = DashboardService.FindOverdue(projects, today);
        Assert.Single(result);
        Assert.Equal("A", result[0].Title);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test tests/Domain.Tests -v`
Expected: FAIL — `DashboardService` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

`src/Api/Services/DashboardService.cs`:
```csharp
using FreelanceWallet.Domain.Entities;

namespace FreelanceWallet.Api.Services;

public record OverdueItemDto(Guid ProjectId, string Title, string ClientName, DateOnly? Deadline, decimal Price);

public static class DashboardService
{
    public static (decimal Income, decimal Expense, decimal Profit) Compute(
        IEnumerable<Transaction> txs, int year, int month)
    {
        var inMonth = txs.Where(t => t.Date.Year == year && t.Date.Month == month);
        var income = inMonth.Where(t => t.Type == TransactionTypes.Income).Sum(t => t.Amount);
        var expense = inMonth.Where(t => t.Type == TransactionTypes.Expense).Sum(t => t.Amount);
        return (income, expense, income - expense);
    }

    public static IReadOnlyList<OverdueItemDto> FindOverdue(
        IEnumerable<Project> projects, DateOnly today) =>
        projects.Where(p => p.IsOverdue(today))
            .Select(p => new OverdueItemDto(p.Id, p.Title, p.Client?.Name ?? "", p.Deadline, p.Price))
            .ToList();
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `dotnet test tests/Domain.Tests -v`
Expected: `Passed: 2`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/Api/Services backend/tests
git commit -m "feat(be): dashboard totals + overdue with tests"
```

---

### Task 3: InvoiceCodeService with TDD + CRUD controllers + error middleware

**Files:**
- Create: `src/Api/Services/InvoiceCodeService.cs`, `tests/Domain.Tests/InvoiceCodeTests.cs`, `src/Api/Controllers/ClientsController.cs`, `src/Api/Controllers/ProjectsController.cs`, `src/Api/Controllers/TransactionsController.cs`, `src/Api/Controllers/DashboardController.cs`, `src/Api/Middleware/ExceptionMiddleware.cs`, DTOs in `src/Api/DTOs/Dtos.cs`
- Modify: `src/Api/Program.cs` (register services + middleware + CORS for Vercel)

**Interfaces:**
- Consumes: `DashboardService`, entities, `AppDbContext`
- Produces: REST from spec §4: `GET /api/dashboard?month=`, CRUD `/api/clients|projects|transactions`; `InvoiceCodeService.Next(IEnumerable<string> existingCodes, int year) -> string`

- [ ] **Step 1: Write invoice-code failing test**

`tests/Domain.Tests/InvoiceCodeTests.cs`:
```csharp
using FreelanceWallet.Api.Services;

public class InvoiceCodeTests
{
    [Fact]
    public void Next_SequentialPerYear_AndResetsOnNewYear()
    {
        Assert.Equal("INV-2026-002", InvoiceCodeService.Next(new[] { "INV-2026-001" }, 2026));
        Assert.Equal("INV-2027-001", InvoiceCodeService.Next(new[] { "INV-2026-001", "INV-2026-002" }, 2027));
        Assert.Equal("INV-2026-001", InvoiceCodeService.Next(Array.Empty<string>(), 2026));
    }
}
```

- [ ] **Step 2: Run to verify fail**

Run: `dotnet test tests/Domain.Tests --filter InvoiceCodeTests -v`
Expected: FAIL — type missing.

- [ ] **Step 3: Implement code service + DTOs**

`src/Api/Services/InvoiceCodeService.cs`:
```csharp
using System.Text.RegularExpressions;

namespace FreelanceWallet.Api.Services;

public static partial class InvoiceCodeService
{
    public static string Next(IEnumerable<string> existingCodes, int year)
    {
        var max = existingCodes.Select(c => CodeNumber().Match(c))
            .Where(m => m.Success && int.Parse(m.Groups["y"].Value) == year)
            .Select(m => int.Parse(m.Groups["n"].Value))
            .DefaultIfEmpty(0).Max();
        return $"INV-{year}-{(max + 1):D3}";
    }

    [GeneratedRegex(@"^INV-(?<y>\d{4})-(?<n>\d{3,})$")]
    private static partial Regex CodeNumber();
}
```

Append to `src/Api/DTOs/Dtos.cs`:
```csharp
namespace FreelanceWallet.Api.DTOs;

public record CreateClientDto(string Name, string? Phone, string? Email, string? BankAccount, string? Note);
public record CreateProjectDto(Guid ClientId, string Title, decimal Price, DateOnly? Deadline);
public record UpdateProjectDto(string Title, decimal Price, string Status, DateOnly? Deadline);
public record CreateTransactionDto(Guid? ProjectId, string Type, decimal Amount, DateOnly Date, string? Note);
public record DashboardResponse(decimal Income, decimal Expense, decimal Profit,
    IReadOnlyList<Services.OverdueItemDto> Overdue, IReadOnlyList<object> Doing);
```

- [ ] **Step 4: Controllers (one pattern, three resources)**

`ClientsController.cs` (Projects/Transactions follow the same shape — full code in each file, never "same as clients"):
```csharp
using FreelanceWallet.Domain.Entities;
using FreelanceWallet.Infrastructure;
using FreelanceWallet.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FreelanceWallet.Api.Controllers;

[ApiController, Route("api/clients")]
public class ClientsController(AppDbContext db) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> List()
        => Ok(await db.Clients.OrderBy(c => c.Name).ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create(CreateClientDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Tên khách hàng không được để trống" });
        var c = new Client { Name = dto.Name.Trim(), Phone = dto.Phone, Email = dto.Email, BankAccount = dto.BankAccount, Note = dto.Note };
        db.Clients.Add(c);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = c.Id }, c);
    }

    [HttpGet("{id:guid}")] public async Task<IActionResult> Get(Guid id)
        => await db.Clients.FindAsync(id) is { } c ? Ok(c) : NotFound(new { message = "Không tìm thấy khách hàng" });

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var c = await db.Clients.Include(x => x.Projects).FirstOrDefaultAsync(x => x.Id == id);
        if (c is null) return NotFound(new { message = "Không tìm thấy khách hàng" });
        if (c.Projects.Any()) return BadRequest(new { message = "Khách hàng còn job, không thể xóa" });
        db.Clients.Remove(c);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
```

`ProjectsController.cs` — full code, không rút gọn:

```csharp
using FreelanceWallet.Domain.Entities;
using FreelanceWallet.Infrastructure;
using FreelanceWallet.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FreelanceWallet.Api.Controllers;

[ApiController, Route("api/projects")]
public class ProjectsController(AppDbContext db) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> List([FromQuery] string? status)
    {
        var q = db.Projects.Include(p => p.Client).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(p => p.Status == status);
        return Ok(await q.OrderByDescending(p => p.CreatedAt).ToListAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateProjectDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Tên job không được để trống" });
        if (dto.Price <= 0)
            return BadRequest(new { message = "Giá phải lớn hơn 0" });
        if (!await db.Clients.AnyAsync(c => c.Id == dto.ClientId))
            return BadRequest(new { message = "Khách hàng không tồn tại" });
        var p = new Project { ClientId = dto.ClientId, Title = dto.Title.Trim(), Price = dto.Price, Deadline = dto.Deadline };
        db.Projects.Add(p);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = p.Id }, p);
    }

    [HttpGet("{id:guid}")] public async Task<IActionResult> Get(Guid id)
        => await db.Projects.Include(p => p.Client).FirstOrDefaultAsync(p => p.Id == id) is { } p
            ? Ok(p) : NotFound(new { message = "Không tìm thấy job" });

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateProjectDto dto)
    {
        var p = await db.Projects.FindAsync(id);
        if (p is null) return NotFound(new { message = "Không tìm thấy job" });
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Tên job không được để trống" });
        if (dto.Price <= 0)
            return BadRequest(new { message = "Giá phải lớn hơn 0" });
        if (dto.Status is not (ProjectStatuses.Doing or ProjectStatuses.Done or ProjectStatuses.Paid))
            return BadRequest(new { message = "Trạng thái không hợp lệ" });
        var wasPaid = p.Status == ProjectStatuses.Paid;
        p.Title = dto.Title.Trim(); p.Price = dto.Price; p.Status = dto.Status; p.Deadline = dto.Deadline;
        if (dto.Status == ProjectStatuses.Paid && !wasPaid)
            db.Transactions.Add(new Transaction
            {
                ProjectId = p.Id, Type = TransactionTypes.Income, Amount = p.Price,
                Date = DateOnly.FromDateTime(DateTime.UtcNow), Note = $"Thu từ job {p.Title}"
            });
        await db.SaveChangesAsync();
        return Ok(p);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var p = await db.Projects.FindAsync(id);
        if (p is null) return NotFound(new { message = "Không tìm thấy job" });
        db.Projects.Remove(p);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
```

`TransactionsController.cs` — full code:

```csharp
using FreelanceWallet.Domain.Entities;
using FreelanceWallet.Infrastructure;
using FreelanceWallet.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FreelanceWallet.Api.Controllers;

[ApiController, Route("api/transactions")]
public class TransactionsController(AppDbContext db) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> List([FromQuery] string? month)
    {
        var q = db.Transactions.Include(t => t.Project).AsQueryable();
        if (!string.IsNullOrWhiteSpace(month) && DateOnly.TryParseExact(month + "-01", "yyyy-MM-dd", out var m))
            q = q.Where(t => t.Date.Year == m.Year && t.Date.Month == m.Month);
        return Ok(await q.OrderByDescending(t => t.Date).ToListAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateTransactionDto dto)
    {
        if (dto.Amount <= 0)
            return BadRequest(new { message = "Số tiền phải lớn hơn 0" });
        if (dto.Type is not (TransactionTypes.Income or TransactionTypes.Expense))
            return BadRequest(new { message = "Loại giao dịch không hợp lệ" });
        if (dto.ProjectId.HasValue && !await db.Projects.AnyAsync(p => p.Id == dto.ProjectId))
            return BadRequest(new { message = "Job không tồn tại" });
        var t = new Transaction { ProjectId = dto.ProjectId, Type = dto.Type, Amount = dto.Amount, Date = dto.Date, Note = dto.Note };
        db.Transactions.Add(t);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = t.Id }, t);
    }

    [HttpGet("{id:guid}")] public async Task<IActionResult> Get(Guid id)
        => await db.Transactions.FindAsync(id) is { } t ? Ok(t) : NotFound(new { message = "Không tìm thấy giao dịch" });

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var t = await db.Transactions.FindAsync(id);
        if (t is null) return NotFound(new { message = "Không tìm thấy giao dịch" });
        db.Transactions.Remove(t);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
```

`DashboardController.cs` (thêm `using FreelanceWallet.Api.Services;`):
```csharp
using FreelanceWallet.Domain.Entities;
using FreelanceWallet.Infrastructure;
using FreelanceWallet.Api.DTOs;
using FreelanceWallet.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FreelanceWallet.Api.Controllers;

[ApiController, Route("api/dashboard")]
public class DashboardController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string month)
    {
        if (!DateOnly.TryParseExact(month + "-01", "yyyy-MM-dd", out var m))
            return BadRequest(new { message = "Tháng không hợp lệ, dùng dạng yyyy-MM" });
        var txs = await db.Transactions.Where(t => t.Date.Year == m.Year && t.Date.Month == m.Month).ToListAsync();
        var projects = await db.Projects.Include(p => p.Client).ToListAsync();
        var (income, expense, profit) = DashboardService.Compute(txs, m.Year, m.Month);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return Ok(new DashboardResponse(income, expense, profit,
            DashboardService.FindOverdue(projects, today),
            projects.Where(p => p.Status == ProjectStatuses.Doing)
                .Select(p => new { p.Id, p.Title, ClientName = p.Client!.Name, p.Deadline, p.Price }).ToList<object>()));
    }
}
```

`Middleware/ExceptionMiddleware.cs`:
```csharp
namespace FreelanceWallet.Api.Middleware;

public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> log)
{
    public async Task Invoke(HttpContext ctx)
    {
        try { await next(ctx); }
        catch (Exception ex)
        {
            log.LogError(ex, "Unhandled");
            ctx.Response.StatusCode = 500;
            await ctx.Response.WriteAsJsonAsync(new { message = "Lỗi server, vui lòng thử lại" });
        }
    }
}
```

`Program.cs` additions (register before `app.MapControllers()`):
```csharp
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));
// ...
app.UseMiddleware<FreelanceWallet.Api.Middleware.ExceptionMiddleware>();
app.UseCors();
using (var scope = app.Services.CreateScope())
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
```

- [ ] **Step 5: Run full suite + build**

Run: `dotnet test -v`
Expected: all pass (2 dashboard + 1 invoice = 3 tests), build 0 errors.

- [ ] **Step 6: Commit**

```bash
git add backend
git commit -m "feat(be): invoice codes, CRUD, dashboard endpoint, error middleware"
```

---

### Task 4: QuestPDF invoice endpoint + CSV export + Supabase wiring check

**Files:**
- Create: `src/Api/Pdf/InvoiceTemplate.cs`, `src/Api/Controllers/InvoicesController.cs`, `src/Api/Controllers/ExportController.cs`
- Modify: `src/Api/Api.csproj` (QuestPDF package)

**Interfaces:**
- Consumes: `InvoiceCodeService.Next`, `Project` + `Client` entities
- Produces: `POST /api/projects/{id}/invoice -> application/pdf`; `GET /api/invoices`; `GET /api/invoices/{code}/pdf`; `GET /api/export/transactions.csv?month=`

- [ ] **Step 1: Add package + write template**

Run: `dotnet add src/Api/Api.csproj package QuestPDF`

`src/Api/Pdf/InvoiceTemplate.cs`:
```csharp
using FreelanceWallet.Domain.Entities;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace FreelanceWallet.Api.Pdf;

public static class InvoiceTemplate
{
    public static byte[] Render(Invoice inv, Project p, Client c, string freelancerName, string freelancerContact)
    {
        QuestPDF.Settings.License = LicenseType.Community;
        return Document.Create(doc =>
        {
            doc.Page(page =>
            {
                page.Margin(40);
                page.Header().Row(r =>
                {
                    r.RelativeItem().Column(col =>
                    {
                        col.Item().Text("FREELANCE WALLET").Bold().FontSize(18);
                        col.Item().Text($"{freelancerName} | {freelancerContact}");
                    });
                    r.ConstantItem(140).AlignRight().Text(inv.Code).Bold().FontSize(14);
                });
                page.Content().PaddingVertical(16).Column(col =>
                {
                    col.Item().Text($"Khách hàng: {c.Name}");
                    if (!string.IsNullOrWhiteSpace(c.BankAccount))
                        col.Item().Text($"STK: {c.BankAccount}");
                    col.Item().PaddingTop(12).Table(t =>
                    {
                        t.ColumnsDefinition(cd => { cd.RelativeColumn(3); cd.RelativeColumn(1); });
                        t.Header(h => { h.Cell().Text("Nội dung").Bold(); h.Cell().AlignRight().Text("Số tiền").Bold(); });
                        t.Cell().Text(p.Title);
                        t.Cell().AlignRight().Text($"{p.Price:N0} đ");
                        t.Cell().Text("Tổng cộng").Bold();
                        t.Cell().AlignRight().Text($"{p.Price:N0} đ").Bold();
                    });
                });
                page.Footer().AlignCenter().Text($"Cảm ơn quý khách! Mã: {inv.Code}");
            });
        }).GeneratePdf();
    }
}
```

- [ ] **Step 2: Invoices + Export controllers**

`src/Api/Controllers/InvoicesController.cs`:
```csharp
using FreelanceWallet.Domain.Entities;
using FreelanceWallet.Infrastructure;
using FreelanceWallet.Api.Services;
using FreelanceWallet.Api.Pdf;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FreelanceWallet.Api.Controllers;

[ApiController, Route("api")]
public class InvoicesController(AppDbContext db, IConfiguration cfg) : ControllerBase
{
    [HttpPost("projects/{id:guid}/invoice")]
    public async Task<IActionResult> Create(Guid id)
    {
        var p = await db.Projects.Include(x => x.Client).FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound(new { message = "Không tìm thấy job" });
        if (p.Client is null) return BadRequest(new { message = "Job chưa có khách hàng" });
        var existing = await db.Invoices.FirstOrDefaultAsync(i => i.ProjectId == id);
        if (existing is not null) return BadRequest(new { message = $"Job đã có invoice {existing.Code}" });
        var year = DateTime.UtcNow.Year;
        var codes = await db.Invoices.Where(i => i.Code.StartsWith($"INV-{year}-")).Select(i => i.Code).ToListAsync();
        var inv = new Invoice { ProjectId = id, Code = InvoiceCodeService.Next(codes, year) };
        db.Invoices.Add(inv);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException) { return Conflict(new { message = "Trùng mã invoice, bấm lại" }); }
        var pdf = InvoiceTemplate.Render(inv, p, p.Client,
            cfg["Profile:Name"] ?? "Freelancer", cfg["Profile:Contact"] ?? "");
        return File(pdf, "application/pdf", $"{inv.Code}.pdf");
    }

    [HttpGet("invoices")] public async Task<IActionResult> List()
        => Ok(await db.Invoices.Include(i => i.Project).OrderByDescending(i => i.IssuedAt).ToListAsync());

    [HttpGet("invoices/{code}/pdf")]
    public async Task<IActionResult> Download(string code)
    {
        var inv = await db.Invoices.Include(i => i.Project).ThenInclude(p => p!.Client)
            .FirstOrDefaultAsync(i => i.Code == code);
        if (inv?.Project?.Client is null) return NotFound(new { message = "Không tìm thấy invoice" });
        var pdf = InvoiceTemplate.Render(inv, inv.Project, inv.Project.Client,
            cfg["Profile:Name"] ?? "Freelancer", cfg["Profile:Contact"] ?? "");
        return File(pdf, "application/pdf", $"{inv.Code}.pdf");
    }
}
```

`src/Api/Controllers/ExportController.cs`: `GET /api/export/transactions.csv?month=2026-09` returns CSV `Date,Type,Amount,Note,Project` built from Transactions of that month, content-type `text/csv`, filename `transactions-2026-09.csv`.

- [ ] **Step 3: Migration against Supabase + smoke test**

Run:
```bash
dotnet ef migrations add Initial --project src/Infrastructure --startup-project src/Api
dotnet ef database update --project src/Infrastructure --startup-project src/Api
dotnet run --project src/Api
```
With `ConnectionStrings__DefaultConnection` set to the Supabase URL (from User Secrets/env, never committed). Then `GET http://localhost:5000/api/dashboard?month=2026-09` must return `{"income":0,"expense":0,"profit":0,...}` — not a 500.
Expected: migration applies, endpoint returns 200 with zeros on empty DB.

- [ ] **Step 4: Full test run + commit**

Run: `dotnet test -v`
Expected: 3/3 pass.

```bash
git add backend
git commit -m "feat(be): invoice PDF, export CSV, supabase wiring"
```
