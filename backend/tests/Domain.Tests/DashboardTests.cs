using FreelanceWallet.Api.Services;
using FreelanceWallet.Domain.Entities;

public class DashboardTests
{
    [Fact]
    public void Compute_MixedMonth_ReturnsExactDecimalTotals()
    {
        var txs = new[]
        {
            new Transaction { Type = TransactionTypes.Income, Amount = 12_500_000m, Date = new DateOnly(2026, 9, 5) },
            new Transaction { Type = TransactionTypes.Income, Amount = 3_000_000m, Date = new DateOnly(2026, 9, 20) },
            new Transaction { Type = TransactionTypes.Expense, Amount = 500_000m, Date = new DateOnly(2026, 9, 2) },
            new Transaction { Type = TransactionTypes.Income, Amount = 99m, Date = new DateOnly(2026, 8, 1) },
        };
        var (income, expense, profit) = DashboardService.Compute(txs, 2026, 9);
        Assert.Equal(15_500_000m, income);
        Assert.Equal(500_000m, expense);
        Assert.Equal(15_000_000m, profit);
    }

    [Fact]
    public void FindOverdue_OnlyUnpaidPastDeadline()
    {
        var today = new DateOnly(2026, 9, 4);
        var projects = new[]
        {
            new Project { Title = "A", Status = ProjectStatuses.Doing, Deadline = new DateOnly(2026, 9, 1) },
            new Project { Title = "B", Status = ProjectStatuses.Paid, Deadline = new DateOnly(2026, 8, 1) },
            new Project { Title = "C", Status = ProjectStatuses.Doing, Deadline = new DateOnly(2026, 10, 1) },
        };
        var result = DashboardService.FindOverdue(projects, today);
        Assert.Single(result);
        Assert.Equal("A", result[0].Title);
    }
}
