namespace FreelanceWallet.Domain.Entities;

public class Invoice
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }
    public string Code { get; set; } = string.Empty;
    public DateOnly IssuedAt { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
}