using FreelanceWallet.Api.Services;
using FreelanceWallet.Domain.Entities;

public class AccountsTests
{
    [Fact]
    public void ComputeBalances_OpeningPlusFlows_PerAccountAndTotal()
    {
        var vcb = new Account { Name = "VCB", OpeningBalance = 10_000_000m };
        var cash = new Account { Name = "Tiền mặt", OpeningBalance = 1_000_000m };
        var txs = new[]
        {
            new Transaction { AccountId = vcb.Id, Type = TransactionTypes.Income, Amount = 5_000_000m, Date = new DateOnly(2026, 9, 5) },
            new Transaction { AccountId = vcb.Id, Type = TransactionTypes.Expense, Amount = 2_000_000m, Date = new DateOnly(2026, 8, 1) },
            new Transaction { AccountId = cash.Id, Type = TransactionTypes.Expense, Amount = 200_000m, Date = new DateOnly(2026, 9, 2) },
            new Transaction { AccountId = null, Type = TransactionTypes.Income, Amount = 999m, Date = new DateOnly(2026, 9, 3) },
        };
        var result = DashboardService.ComputeBalances(new[] { vcb, cash }, txs);
        Assert.Equal(13_000_000m, result.Balances.Single(b => b.Id == vcb.Id).Balance);
        Assert.Equal(800_000m, result.Balances.Single(b => b.Id == cash.Id).Balance);
        Assert.Equal(13_800_000m, result.Total);
    }

    [Fact]
    public void GroupExpenseByCategory_OnlyMonthExpenses_NullBecomesUncategorized()
    {
        var txs = new[]
        {
            new Transaction { Type = TransactionTypes.Expense, Amount = 500_000m, Date = new DateOnly(2026, 9, 2), Category = "Ăn uống" },
            new Transaction { Type = TransactionTypes.Expense, Amount = 300_000m, Date = new DateOnly(2026, 9, 3), Category = "Ăn uống" },
            new Transaction { Type = TransactionTypes.Expense, Amount = 100_000m, Date = new DateOnly(2026, 9, 4), Category = null },
            new Transaction { Type = TransactionTypes.Income, Amount = 9_000_000m, Date = new DateOnly(2026, 9, 5), Category = "Ăn uống" },
            new Transaction { Type = TransactionTypes.Expense, Amount = 50_000m, Date = new DateOnly(2026, 8, 1), Category = "Ăn uống" },
        };
        var result = DashboardService.GroupExpenseByCategory(txs, 2026, 9);
        Assert.Equal(800_000m, result.Single(r => r.Category == "Ăn uống").Total);
        Assert.Equal(100_000m, result.Single(r => r.Category == "Chưa phân loại").Total);
        Assert.Equal(2, result.Count);
    }
}
