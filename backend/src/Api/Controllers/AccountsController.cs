using FreelanceWallet.Domain.Entities;
using FreelanceWallet.Infrastructure;
using FreelanceWallet.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FreelanceWallet.Api.Controllers;

[ApiController, Route("api/accounts")]
public class AccountsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var accounts = await db.Accounts.OrderBy(a => a.Name).ToListAsync();
        var txs = await db.Transactions.ToListAsync();
        var result = Services.DashboardService.ComputeBalances(accounts, txs);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateAccountDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Tên ví không được để trống" });
        if (dto.OpeningBalance < 0)
            return BadRequest(new { message = "Số dư đầu kỳ không được âm" });
        var a = new Account { Name = dto.Name.Trim(), OpeningBalance = dto.OpeningBalance };
        db.Accounts.Add(a);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = a.Id },
            new Services.AccountBalanceDto(a.Id, a.Name, a.OpeningBalance, a.OpeningBalance));
    }

    [HttpGet("{id:guid}")] public async Task<IActionResult> Get(Guid id)
        => await db.Accounts.FindAsync(id) is { } a ? Ok(a) : NotFound(new { message = "Không tìm thấy ví" });

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateAccountDto dto)
    {
        var a = await db.Accounts.FindAsync(id);
        if (a is null) return NotFound(new { message = "Không tìm thấy ví" });
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Tên ví không được để trống" });
        if (dto.OpeningBalance < 0)
            return BadRequest(new { message = "Số dư đầu kỳ không được âm" });
        a.Name = dto.Name.Trim();
        a.OpeningBalance = dto.OpeningBalance;
        await db.SaveChangesAsync();
        return Ok(a);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var a = await db.Accounts.Include(x => x.Transactions).FirstOrDefaultAsync(x => x.Id == id);
        if (a is null) return NotFound(new { message = "Không tìm thấy ví" });
        if (a.Transactions.Any()) return BadRequest(new { message = "Ví còn giao dịch, không thể xóa" });
        db.Accounts.Remove(a);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
