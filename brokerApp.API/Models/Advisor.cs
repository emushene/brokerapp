namespace brokerApp.API.Models;

public class Advisor
{
    public int Id { get; set; }
    public string FirebaseId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    
    public decimal CommissionPercentage1stYear { get; set; } = 70.0m;
    public decimal CommissionPercentage2ndYear { get; set; } = 70.0m;

    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
    public ICollection<AccountAdjustment> Adjustments { get; set; } = new List<AccountAdjustment>();
}
