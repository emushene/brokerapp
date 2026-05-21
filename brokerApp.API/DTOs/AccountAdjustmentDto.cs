using brokerApp.API.Models;

namespace brokerApp.API.DTOs;

public class AccountAdjustmentDto
{
    public int Id { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal RemainingBalance { get; set; }
    public int Quantity { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime DateIncurred { get; set; }
    public int Type { get; set; }
    public int Status { get; set; }
    public int? AdvisorId { get; set; }
    public string? AdvisorName { get; set; }
    public int? AdvisorGroupId { get; set; }
    public string? AdvisorGroupName { get; set; }
    public int? PromotionalItemId { get; set; }
    public string? PromotionalItemName { get; set; }
}
