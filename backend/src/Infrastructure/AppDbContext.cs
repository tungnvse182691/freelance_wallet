using FreelanceWallet.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FreelanceWallet.Infrastructure;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Invoice> Invoices => Set<Invoice>();

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
            e.HasIndex(t => t.Date);
        });
        b.Entity<Invoice>(e =>
        {
            e.HasIndex(i => i.Code).IsUnique();
            e.HasIndex(i => i.ProjectId).IsUnique();
        });
        foreach (var et in b.Model.GetEntityTypes())
            foreach (var p in et.GetProperties().Where(p => p.ClrType == typeof(DateTime)))
                p.SetColumnType("timestamptz");
    }
}