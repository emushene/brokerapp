using Microsoft.EntityFrameworkCore;
using brokerApp.API.Models;

namespace brokerApp.API.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Submission> Submissions { get; set; }
    public DbSet<Advisor> Advisors { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Submission>()
            .HasMany(s => s.Advisors)
            .WithMany(a => a.Submissions)
            .UsingEntity(j => j.ToTable("SubmissionAdvisors"));
    }
}