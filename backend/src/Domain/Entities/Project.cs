namespace FreelanceWallet.Domain.Entities;

public static class ProjectStatuses
{
    public const string Doing = "Doing";
    public const string Done = "Done";
    public const string Paid = "Paid";
}

public class Project
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClientId { get; set; }
    public Client? Client { get; set; }
    public string Title { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Status { get; set; } = ProjectStatuses.Doing;
    public DateOnly? Deadline { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsOverdue(DateOnly today) =>
        Deadline.HasValue && Deadline.Value < today && Status != ProjectStatuses.Paid;
}