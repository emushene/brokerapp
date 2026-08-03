using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace brokerApp.API.Models;

public class CommissionStatement
{
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string? FileUrl { get; set; }
    public string? GoogleSheetUrl { get; set; }
    public DateTime StatementDate { get; set; }
    public DateTime UploadDate { get; set; } = DateTime.UtcNow;
    public decimal TotalCommission { get; set; }
    public int TotalRows { get; set; }
    public int MatchedRows { get; set; }
    public string Status { get; set; } = "Draft"; // Draft, Concluded, Emailed
    public DateTime? EmailSentDate { get; set; }
    
    public ICollection<StatementItem> Items { get; set; } = new List<StatementItem>();
    public ICollection<MovementItem> MovementItems { get; set; } = new List<MovementItem>();
    public ICollection<UnpayablePolicyItem> UnpayableItems { get; set; } = new List<UnpayablePolicyItem>();
}

public class StatementItem
{
    public int Id { get; set; }
    public int CommissionStatementId { get; set; }
    public CommissionStatement Statement { get; set; } = null!;

    public string ClientName { get; set; } = string.Empty;
    public string PolicyNumber { get; set; } = string.Empty;
    public string CommissionType { get; set; } = string.Empty;
    public string CommissionSubType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal Premium { get; set; }
    public string Category { get; set; } = "Unknown"; // Lapse, First Year, Second Year
    
    public string? SalesForceName { get; set; }
    public string? Product { get; set; }
    public DateTime? CaptureDate { get; set; }
    public decimal? GrossCommission { get; set; }
    public decimal? CommissionRetention { get; set; }
    public decimal? ClawBack { get; set; }
    public decimal? ClawBackRetention { get; set; }
    public decimal? NettCommission { get; set; }
    public string? ClawBackReason { get; set; }

    // Tracking the match
    public int? MatchedSubmissionId { get; set; }
    public Submission? MatchedSubmission { get; set; }
    public string? AdvisorName { get; set; } // Internal advisor who owns the policy
    public string? FileUrl { get; set; }
    public string? GoogleDriveLink { get; set; }
    public bool IsMatched => MatchedSubmissionId.HasValue;
    public bool IsConfirmed { get; set; }
}

public class MovementItem
{
    public int Id { get; set; }
    public int CommissionStatementId { get; set; }
    public CommissionStatement Statement { get; set; } = null!;

    public string PolicyNumber { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string MovementType { get; set; } = string.Empty; 
    public DateTime? EffectiveDate { get; set; }
    public decimal Premium { get; set; }
    [NotMapped]
    public decimal Amount { get; set; }
    public string Category { get; set; } = "Unknown";

    // Tracking the match
    public int? MatchedSubmissionId { get; set; }
    public Submission? MatchedSubmission { get; set; }
    public string? AdvisorName { get; set; } // Internal advisor who owns the policy
    public string? FileUrl { get; set; }
    public string? GoogleDriveLink { get; set; }
    public bool IsMatched => MatchedSubmissionId.HasValue;
    public bool IsConfirmed { get; set; }
}

public class UnpayablePolicyItem
{
    public int Id { get; set; }
    public int CommissionStatementId { get; set; }
    public CommissionStatement Statement { get; set; } = null!;

    public string PolicyNumber { get; set; } = string.Empty;
    public string? PolicyId { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string? ClientMobile { get; set; }
    public decimal Premium { get; set; }
    public decimal PremiumBalance { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? PolicyStatus { get; set; }
    public string? Paymethod { get; set; }
    public DateTime? CapturedDate { get; set; }
    public DateTime? InceptionDate { get; set; }

    // Tracking match to internal advisor/submission
    public int? MatchedSubmissionId { get; set; }
    public Submission? MatchedSubmission { get; set; }
    public string? AdvisorName { get; set; }
    public bool IsMatched => MatchedSubmissionId.HasValue;
}

