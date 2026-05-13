using System;
using System.Collections.Generic;

namespace brokerApp.API.Models;

public class CommissionStatement
{
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string? FileUrl { get; set; }
    public DateTime StatementDate { get; set; }
    public DateTime UploadDate { get; set; } = DateTime.UtcNow;
    public decimal TotalCommission { get; set; }
    public int TotalRows { get; set; }
    public int MatchedRows { get; set; }
    
    public ICollection<StatementItem> Items { get; set; } = new List<StatementItem>();
    public ICollection<MovementItem> MovementItems { get; set; } = new List<MovementItem>();
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
    
    // Tracking the match
    public int? MatchedSubmissionId { get; set; }
    public Submission? MatchedSubmission { get; set; }
    public string? AdvisorName { get; set; } // Internal advisor who owns the policy
    public string? FileUrl { get; set; }
    public string? GoogleDriveLink { get; set; }
    public bool IsMatched => MatchedSubmissionId.HasValue;
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
    public string Category { get; set; } = "Unknown";

    // Tracking the match
    public int? MatchedSubmissionId { get; set; }
    public Submission? MatchedSubmission { get; set; }
    public string? AdvisorName { get; set; } // Internal advisor who owns the policy
    public string? FileUrl { get; set; }
    public string? GoogleDriveLink { get; set; }
    public bool IsMatched => MatchedSubmissionId.HasValue;
}
