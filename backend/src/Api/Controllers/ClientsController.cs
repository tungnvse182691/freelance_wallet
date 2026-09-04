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
