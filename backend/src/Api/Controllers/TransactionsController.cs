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
        if (dto.AccountId.HasValue && !await db.Accounts.AnyAsync(a => a.Id == dto.AccountId))
            return BadRequest(new { message = "Ví không tồn tại" });
        var t = new Transaction { ProjectId = dto.ProjectId, Type = dto.Type, Amount = dto.Amount, Date = dto.Date, Note = dto.Note, AccountId = dto.AccountId, Category = string.IsNullOrWhiteSpace(dto.Category) ? null : dto.Category.Trim() };
        db.Transactions.Add(t);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = t.Id }, t);
    }

    [HttpGet("{id:guid}")] public async Task<IActionResult> Get(Guid id)
        => await db.Transactions.FindAsync(id) is { } t ? Ok(t) : NotFound(new { message = "Không tìm thấy giao dịch" });

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateTransactionDto dto)
    {
        var t = await db.Transactions.FindAsync(id);
        if (t is null) return NotFound(new { message = "Không tìm thấy giao dịch" });
        if (dto.Amount <= 0)
            return BadRequest(new { message = "Số tiền phải lớn hơn 0" });
        if (dto.Type is not (TransactionTypes.Income or TransactionTypes.Expense))
            return BadRequest(new { message = "Loại giao dịch không hợp lệ" });
        if (dto.ProjectId.HasValue && !await db.Projects.AnyAsync(p => p.Id == dto.ProjectId))
            return BadRequest(new { message = "Job không tồn tại" });
        if (dto.AccountId.HasValue && !await db.Accounts.AnyAsync(a => a.Id == dto.AccountId))
            return BadRequest(new { message = "Ví không tồn tại" });
        t.ProjectId = dto.ProjectId; t.Type = dto.Type; t.Amount = dto.Amount; t.Date = dto.Date;
        t.Note = dto.Note; t.AccountId = dto.AccountId;
        t.Category = string.IsNullOrWhiteSpace(dto.Category) ? null : dto.Category.Trim();
        await db.SaveChangesAsync();
        return Ok(t);
    }

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
