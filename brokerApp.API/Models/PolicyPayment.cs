namespace brokerApp.API.Models;

public class PolicyPayment
{
    public int Id { get; set; }
    public int SubmissionId { get; set; }
    public Submission Submission { get; set; } = null!;
    public decimal AmountReceived { get; set; }
    public DateTime DateReceived { get; set; } = DateTime.UtcNow;
    public string Reference { get; set; } = string.Empty;

    public ICollection<AdvisorCommission> Commissions { get; set; } = new List<AdvisorCommission>();
}