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
    public DbSet<PolicyPayment> PolicyPayments { get; set; }
    public DbSet<AdvisorCommission> AdvisorCommissions { get; set; } = null!;
    public DbSet<SubmissionDocument> SubmissionDocuments { get; set; } = null!;
    public DbSet<CommissionStatement> CommissionStatements { get; set; } = null!;
    public DbSet<StatementItem> StatementItems { get; set; } = null!;
    public DbSet<MovementItem> MovementItems { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Submission>()
            .HasMany(s => s.Advisors)
            .WithMany(a => a.Submissions)
            .UsingEntity(j => j.ToTable("SubmissionAdvisors"));

        modelBuilder.Entity<PolicyPayment>()
            .HasOne(p => p.Submission)
            .WithMany()
            .HasForeignKey(p => p.SubmissionId);

        modelBuilder.Entity<AdvisorCommission>()
            .HasOne(c => c.PolicyPayment)
            .WithMany(p => p.Commissions)
            .HasForeignKey(c => c.PolicyPaymentId)
            .IsRequired(false);

        modelBuilder.Entity<AdvisorCommission>()
            .HasOne(c => c.Submission)
            .WithMany()
            .HasForeignKey(c => c.SubmissionId)
            .IsRequired(false);

        modelBuilder.Entity<AdvisorCommission>()
            .HasOne(c => c.Advisor)
            .WithMany()
            .HasForeignKey(c => c.AdvisorId);

        modelBuilder.Entity<CommissionStatement>()
            .HasMany(s => s.Items)
            .WithOne(i => i.Statement)
            .HasForeignKey(i => i.CommissionStatementId);

        modelBuilder.Entity<CommissionStatement>()
            .HasMany(s => s.MovementItems)
            .WithOne(i => i.Statement)
            .HasForeignKey(i => i.CommissionStatementId);

        modelBuilder.Entity<StatementItem>()
            .HasOne(i => i.MatchedSubmission)
            .WithMany()
            .HasForeignKey(i => i.MatchedSubmissionId)
            .IsRequired(false);

        modelBuilder.Entity<MovementItem>()
            .HasOne(i => i.MatchedSubmission)
            .WithMany()
            .HasForeignKey(i => i.MatchedSubmissionId)
            .IsRequired(false);
    }
}
