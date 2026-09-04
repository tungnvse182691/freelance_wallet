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
