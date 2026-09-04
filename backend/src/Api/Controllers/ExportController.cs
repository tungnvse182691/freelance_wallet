using System.Text;
using FreelanceWallet.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FreelanceWallet.Api.Controllers;

[ApiController, Route("api/export")]
public class ExportController(AppDbContext db) : ControllerBase
{
    [HttpGet("transactions.csv")]
    public async Task<IActionResult> TransactionsCsv([FromQuery] string? month)
    {
        if (string.IsNullOrWhiteSpace(month)
            || !DateOnly.TryParseExact(month + "-01", "yyyy-MM-dd", out var m))
            return BadRequest(new { message = "Tháng không hợp lệ, dùng dạng yyyy-MM" });
        var txs = await db.Transactions.Include(t => t.Project)
            .Where(t => t.Date.Year == m.Year && t.Date.Month == m.Month)
            .OrderBy(t => t.Date)
            .ToListAsync();
        var sb = new StringBuilder();
        sb.AppendLine("Date,Type,Amount,Note,Project");
        foreach (var t in txs)
            sb.AppendLine(string.Join(',',
                t.Date.ToString("yyyy-MM-dd"), Cell(t.Type), t.Amount.ToString("0.00"),
                Cell(t.Note ?? ""), Cell(t.Project?.Title ?? "")));
        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", $"transactions-{month}.csv");
    }

    private static string Cell(string v)
        => v.Contains(',') || v.Contains('"') || v.Contains('\n')
            ? '"' + v.Replace("\"", "\"\"") + '"' : v;
}
