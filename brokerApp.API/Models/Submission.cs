namespace brokerApp.API.Models;

public class Submission
{
    public int Id { get; set; }

    public string ApplicantSurname { get; set; } = string.Empty;

    public string Initials { get; set; } = string.Empty;

    public string IdNumber { get; set; } = string.Empty;

    public decimal Premium { get; set; }

    public string SalaryRefNo { get; set; } = string.Empty;

    public string ApplicantPhoneNumber { get; set; } = string.Empty;

    public SubmissionType Type { get; set; }

    public PaymentMethod Method { get; set; } = PaymentMethod.Salary;

    public SubmissionStatus Status { get; set; } = SubmissionStatus.Submitted;

    public DateTime Date { get; set; }

    public ICollection<Advisor> Advisors { get; set; } = new List<Advisor>();

    public ICollection<SubmissionDocument> Documents { get; set; } = new List<SubmissionDocument>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}