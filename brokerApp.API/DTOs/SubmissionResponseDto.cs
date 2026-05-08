namespace brokerApp.API.DTOs;

public class SubmissionResponseDto
{
    public int Id { get; set; }
    public string ApplicantSurname { get; set; } = string.Empty;
    public string Initials { get; set; } = string.Empty;
    public string IdNumber { get; set; } = string.Empty;
    public decimal Premium { get; set; }
    public string SalaryRefNo { get; set; } = string.Empty;
    public string ApplicantPhoneNumber { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Method { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public List<AdvisorDto> Advisors { get; set; } = new List<AdvisorDto>();
    public List<SubmissionDocumentDto> Documents { get; set; } = new List<SubmissionDocumentDto>();
    public DateTime CreatedAt { get; set; }
}