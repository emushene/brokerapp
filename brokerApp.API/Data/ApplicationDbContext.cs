using Microsoft.EntityFrameworkCore;
using brokerApp.API.Data;
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
    public DbSet<AdvisorGroup> AdvisorGroups { get; set; } = null!;
    public DbSet<PolicyPayment> PolicyPayments { get; set; }
    public DbSet<AdvisorCommission> AdvisorCommissions { get; set; } = null!;
    public DbSet<SubmissionDocument> SubmissionDocuments { get; set; } = null!;
    public DbSet<CommissionStatement> CommissionStatements { get; set; } = null!;
    public DbSet<StatementItem> StatementItems { get; set; } = null!;
    public DbSet<MovementItem> MovementItems { get; set; } = null!;
    public DbSet<UnpayablePolicyItem> UnpayablePolicyItems { get; set; } = null!;
    public DbSet<PolicyRecord> PolicyRecords { get; set; } = null!;
    public DbSet<PromotionalItem> PromotionalItems { get; set; } = null!;
    public DbSet<AccountAdjustment> AccountAdjustments { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Enable PostgreSQL Trigram extension for fast text search
        modelBuilder.HasPostgresExtension("pg_trgm");

        modelBuilder.Entity<PolicyRecord>()
            .HasMany(p => p.Advisors)
            .WithMany()
            .UsingEntity(j => j.ToTable("PolicyAdvisors"));

        modelBuilder.Entity<Submission>()
            .HasMany(s => s.Advisors)
            .WithMany(a => a.Submissions)
            .UsingEntity(j => j.ToTable("SubmissionAdvisors"));

        modelBuilder.Entity<AdvisorGroup>()
            .HasMany(g => g.Members)
            .WithMany()
            .UsingEntity(j => j.ToTable("AdvisorGroupMembers"));

        modelBuilder.Entity<Submission>()
            .HasOne(s => s.AdvisorGroup)
            .WithMany(g => g.Submissions)
            .HasForeignKey(s => s.AdvisorGroupId)
            .IsRequired(false);

        // Optimize Submissions for high-volume search and sorting
        modelBuilder.Entity<Submission>(entity =>
        {
            // Trigram GIN indexes for fuzzy search (LIKE '%query%')
            entity.HasIndex(s => s.PolicyNumber)
                  .HasMethod("gin")
                  .HasOperators("gin_trgm_ops");

            entity.HasIndex(s => s.ApplicantSurname)
                  .HasMethod("gin")
                  .HasOperators("gin_trgm_ops");

            entity.HasIndex(s => s.Initials)
                  .HasMethod("gin")
                  .HasOperators("gin_trgm_ops");

            // Regular index for sorting by creation date
            entity.HasIndex(s => s.CreatedAt);
        });

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

        modelBuilder.Entity<CommissionStatement>()
            .HasMany(s => s.UnpayableItems)
            .WithOne(i => i.Statement)
            .HasForeignKey(i => i.CommissionStatementId);

        modelBuilder.Entity<StatementItem>()
            .HasOne(i => i.MatchedSubmission)
            .WithMany()
            .HasForeignKey(i => i.MatchedSubmissionId)
            .IsRequired(false);

        modelBuilder.Entity<MovementItem>()
            .Ignore(m => m.Amount)
            .HasOne(i => i.MatchedSubmission)
            .WithMany()
            .HasForeignKey(i => i.MatchedSubmissionId)
            .IsRequired(false);

        modelBuilder.Entity<UnpayablePolicyItem>()
            .HasOne(i => i.MatchedSubmission)
            .WithMany()
            .HasForeignKey(i => i.MatchedSubmissionId)
            .IsRequired(false);

        modelBuilder.Entity<SubmissionDocument>(entity =>
        {
            entity.HasIndex(d => d.StorageKey)
                  .IsUnique();
        });

        modelBuilder.Entity<AccountAdjustment>(entity =>
        {
            entity.HasOne(a => a.Advisor)
                  .WithMany(a => a.Adjustments)
                  .HasForeignKey(a => a.AdvisorId)
                  .IsRequired(false);

            entity.HasOne(a => a.AdvisorGroup)
                  .WithMany()
                  .HasForeignKey(a => a.AdvisorGroupId)
                  .IsRequired(false);

            entity.HasOne(a => a.PromotionalItem)
                  .WithMany()
                  .HasForeignKey(a => a.PromotionalItemId)
                  .IsRequired(false);
        });
    }
}
