namespace brokerApp.API.DTOs;

public class PolicyPaymentCreateDto
{
    public int SubmissionId { get; set; }
    public decimal AmountReceived { get; set; }
    public DateTime DateReceived { get; set; }
    public string Reference { get; set; } = string.Empty;
}