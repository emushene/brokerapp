namespace brokerApp.API.DTOs;

public class CommissionResponseDto
{
    public int Id { get; set; }
    public int? PolicyPaymentId { get; set; }
    public int? CommissionStatementId { get; set; }
    public decimal AmountReceived { get; set; }
    public string Reference { get; set; } = string.Empty;
    public int AdvisorId { get; set; }
    public string AdvisorName { get; set; } = string.Empty;
    public string ApplicantSurname { get; set; } = string.Empty;
    public string ApplicantInitials { get; set; } = string.Empty;
    public decimal CommissionAmount { get; set; }
    public DateTime DateCalculated { get; set; }
    
    public bool IsPaid { get; set; }
    public DateTime? DatePaid { get; set; }
    public string? PayoutReference { get; set; }
    public string? FileUrl { get; set; }
}
