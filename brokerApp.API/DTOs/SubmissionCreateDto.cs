namespace brokerApp.API.DTOs;

public class SubmissionCreateDto
{
    public string ApplicantSurname { get; set; } = string.Empty;
    public string Initials { get; set; } = string.Empty;
    public string IdNumber { get; set; } = string.Empty;
    public decimal Premium { get; set; }
    public string SalaryRefNo { get; set; } = string.Empty;
    public string ApplicantPhoneNumber { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string IntermediaryName { get; set; } = string.Empty;
    public string IntermediaryCode { get; set; } = string.Empty;
}