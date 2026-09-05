using FreelanceWallet.Domain.Entities;

namespace FreelanceWallet.Api.Services;

public record OverdueItemDto(Guid ProjectId, string Title, string ClientName, DateOnly? Deadline, decimal Price);
public record AccountBalanceDto(Guid Id, string Name, decimal Balance, decimal OpeningBalance);
public record BalancesResult(IReadOnlyList<AccountBalanceDto> Balances, decimal Total);
public record CategoryTotalDto(string Category, decimal Total);

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

    public static BalancesResult ComputeBalances(
        IEnumerable<Account> accounts, IEnumerable<Transaction> txs)
    {
        var list = txs.ToList();
        var balances = accounts.Select(a =>
        {
            var flows = list.Where(t => t.AccountId == a.Id);
            var income = flows.Where(t => t.Type == TransactionTypes.Income).Sum(t => t.Amount);
            var expense = flows.Where(t => t.Type == TransactionTypes.Expense).Sum(t => t.Amount);
            return new AccountBalanceDto(a.Id, a.Name, a.OpeningBalance + income - expense, a.OpeningBalance);
        }).ToList();
        return new BalancesResult(balances, balances.Sum(b => b.Balance));
    }

    public static IReadOnlyList<CategoryTotalDto> GroupExpenseByCategory(
        IEnumerable<Transaction> txs, int year, int month) =>
        txs.Where(t => t.Type == TransactionTypes.Expense && t.Date.Year == year && t.Date.Month == month)
            .GroupBy(t => string.IsNullOrWhiteSpace(t.Category) ? "Chưa phân loại" : t.Category!.Trim())
            .Select(g => new CategoryTotalDto(g.Key, g.Sum(t => t.Amount)))
            .OrderByDescending(r => r.Total)
            .ToList();
}
