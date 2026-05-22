namespace brokerApp.API.DTOs;

public class ManualLinkMovementDto
{
    public int SubmissionId { get; set; }
    public List<int>? SelectedAdvisorIds { get; set; }
    public int? AdvisorGroupId { get; set; }
}
