using FreelanceWallet.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FreelanceWallet.Infrastructure;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<Note> Notes => Set<Note>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Project>(e =>
        {
            e.Property(p => p.Price).HasColumnType("numeric(18,2)");
            e.HasIndex(p => new { p.Status, p.Deadline });
        });
        b.Entity<Transaction>(e =>
        {
            e.Property(t => t.Amount).HasColumnType("numeric(18,2)");
            e.Property(t => t.Category).HasMaxLength(100);
            e.HasOne(t => t.Account).WithMany(a => a.Transactions)
                .HasForeignKey(t => t.AccountId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(t => t.Date);
            e.HasIndex(t => t.AccountId);
        });
        b.Entity<Account>(e =>
        {
            e.Property(a => a.OpeningBalance).HasColumnType("numeric(18,2)");
        });
        b.Entity<Invoice>(e =>
        {
            e.HasIndex(i => i.Code).IsUnique();
            e.HasIndex(i => i.ProjectId).IsUnique();
        });
        b.Entity<Note>(e =>
        {
            e.Property(n => n.Title).HasMaxLength(200);
            e.HasIndex(n => n.UpdatedAt);
        });
        foreach (var et in b.Model.GetEntityTypes())
            foreach (var p in et.GetProperties().Where(p => p.ClrType == typeof(DateTime)))
                p.SetColumnType("timestamptz");
    }
}