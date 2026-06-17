namespace brokerApp.API.DTOs;

public class ManualLinkDto
{
    public int SubmissionId { get; set; }
    public List<int>? SelectedAdvisorIds { get; set; }
    public int? AdvisorGroupId { get; set; }
}
