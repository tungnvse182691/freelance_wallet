namespace FreelanceWallet.Api.DTOs;

public record CreateClientDto(string Name, string? Phone, string? Email, string? BankAccount, string? Note);
public record CreateProjectDto(Guid ClientId, string Title, decimal Price, DateOnly? Deadline);
public record UpdateProjectDto(string Title, decimal Price, string Status, DateOnly? Deadline);
public record CreateTransactionDto(Guid? ProjectId, string Type, decimal Amount, DateOnly Date, string? Note);
public record DashboardResponse(decimal Income, decimal Expense, decimal Profit,
    IReadOnlyList<Services.OverdueItemDto> Overdue, IReadOnlyList<object> Doing);
