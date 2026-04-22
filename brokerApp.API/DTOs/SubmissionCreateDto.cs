namespace brokerApp.API.DTOs;

public class SubmissionCreateDto
{
    public string ApplicantSurname { get; set; } = string.Empty;
    public string Initials { get; set; } = string.Empty;
    public string IdNumber { get; set; } = string.Empty;
    public decimal Premium { get; set; }
    public string SalaryRefNo { get; set; } = string.Empty;
    public string ApplicantPhoneNumber { get; set; } = string.Empty;
    public Models.SubmissionType Type { get; set; }
    public DateTime Date { get; set; }
    public List<int> AdvisorIds { get; set; } = new List<int>();
}