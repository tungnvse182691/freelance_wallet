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
