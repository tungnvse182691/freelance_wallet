namespace FreelanceWallet.Api.DTOs;

public record CreateClientDto(string Name, string? Phone, string? Email, string? BankAccount, string? Note);
public record CreateProjectDto(Guid ClientId, string Title, decimal Price, DateOnly? Deadline);
public record UpdateProjectDto(string Title, decimal Price, string Status, DateOnly? Deadline);
public record CreateTransactionDto(Guid? ProjectId, string Type, decimal Amount, DateOnly Date, string? Note, Guid? AccountId = null, string? Category = null);
public record UpdateTransactionDto(Guid? ProjectId, string Type, decimal Amount, DateOnly Date, string? Note, Guid? AccountId, string? Category);
public record UpdateClientDto(string Name, string? Phone, string? Email, string? BankAccount, string? Note);
public record CreateAccountDto(string Name, decimal OpeningBalance);
public record UpdateAccountDto(string Name, decimal OpeningBalance);
public record DashboardResponse(decimal Income, decimal Expense, decimal Profit,
    IReadOnlyList<Services.OverdueItemDto> Overdue, IReadOnlyList<object> Doing,
    decimal TotalBalance, IReadOnlyList<Services.AccountBalanceDto> Accounts,
    IReadOnlyList<Services.CategoryTotalDto> ExpenseByCategory);
