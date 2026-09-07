using FreelanceWallet.Domain.Entities;
using FreelanceWallet.Infrastructure;
using FreelanceWallet.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FreelanceWallet.Api.Controllers;

[ApiController, Route("api/notes")]
public class NotesController(AppDbContext db) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> List()
        => Ok(await db.Notes.OrderByDescending(n => n.UpdatedAt).ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create(CreateNoteDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Tiêu đề không được để trống" });
        if (dto.Title.Trim().Length > 200)
            return BadRequest(new { message = "Tiêu đề tối đa 200 ký tự" });
        var n = new Note { Title = dto.Title.Trim(), Content = dto.Content };
        db.Notes.Add(n);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = n.Id }, n);
    }

    [HttpGet("{id:guid}")] public async Task<IActionResult> Get(Guid id)
        => await db.Notes.FindAsync(id) is { } n ? Ok(n) : NotFound(new { message = "Không tìm thấy ghi chú" });

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateNoteDto dto)
    {
        var n = await db.Notes.FindAsync(id);
        if (n is null) return NotFound(new { message = "Không tìm thấy ghi chú" });
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Tiêu đề không được để trống" });
        if (dto.Title.Trim().Length > 200)
            return BadRequest(new { message = "Tiêu đề tối đa 200 ký tự" });
        n.Title = dto.Title.Trim();
        n.Content = dto.Content;
        n.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(n);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var n = await db.Notes.FindAsync(id);
        if (n is null) return NotFound(new { message = "Không tìm thấy ghi chú" });
        db.Notes.Remove(n);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
