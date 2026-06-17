using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace brokerApp.API.Models;

public class PolicyRecord
{
    [Key]
    public string PolicyNumber { get; set; } = string.Empty;

    public string Surname { get; set; } = string.Empty;

    public string Initials { get; set; } = string.Empty;

    public decimal Premium { get; set; }

    public decimal LastCommissionAmount { get; set; }

    public SubmissionStatus Status { get; set; } = SubmissionStatus.Active;

    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

    public bool IsConfirmed { get; set; } = false;

    public int? AdvisorGroupId { get; set; }
    public AdvisorGroup? AdvisorGroup { get; set; }

    // Many-to-many relationship with Advisors
    public ICollection<Advisor> Advisors { get; set; } = new List<Advisor>();
}
