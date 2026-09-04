namespace FreelanceWallet.Domain.Entities;

public static class TransactionTypes
{
    public const string Income = "Income";
    public const string Expense = "Expense";
}

public class Transaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? ProjectId { get; set; }
    public Project? Project { get; set; }
    public string Type { get; set; } = TransactionTypes.Income;
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}