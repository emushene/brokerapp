using System;

namespace brokerApp.API.Models;

public class AccountAdjustment
{
    public int Id { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal RemainingBalance { get; set; }
    public int Quantity { get; set; } = 1;
    public string Description { get; set; } = string.Empty;
    public DateTime DateIncurred { get; set; } = DateTime.UtcNow;

    public AdjustmentType Type { get; set; }
    public AdjustmentStatus Status { get; set; } = AdjustmentStatus.Pending;

    // Target individual advisor
    public int? AdvisorId { get; set; }
    public Advisor? Advisor { get; set; }

    // OR Target a group (all members share/contribute to deduction)
    public int? AdvisorGroupId { get; set; }
    public AdvisorGroup? AdvisorGroup { get; set; }

    // Optional link to catalog item
    public int? PromotionalItemId { get; set; }
    public PromotionalItem? PromotionalItem { get; set; }
}
