namespace brokerApp.API.Models;

public class AdvisorCommission
{
    public int Id { get; set; }
    
    public int? PolicyPaymentId { get; set; }
    public PolicyPayment? PolicyPayment { get; set; }
    
    public int? SubmissionId { get; set; }
    public Submission? Submission { get; set; }

    public int? CommissionStatementId { get; set; }
    public CommissionStatement? CommissionStatement { get; set; }

    public int? AccountAdjustmentId { get; set; }
    public AccountAdjustment? AccountAdjustment { get; set; }
    
    public int AdvisorId { get; set; }
    public Advisor Advisor { get; set; } = null!;
    
    public decimal CommissionAmount { get; set; }
    public DateTime DateCalculated { get; set; } = DateTime.UtcNow;

    public bool IsPaid { get; set; }
    public DateTime? DatePaid { get; set; }
    public string? PayoutReference { get; set; }
}
