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
