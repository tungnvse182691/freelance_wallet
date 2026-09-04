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
