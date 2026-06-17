namespace brokerApp.API.DTOs;

public class ConfirmLinkDto
{
    public List<int>? SelectedAdvisorIds { get; set; }
    public int? AdvisorGroupId { get; set; }
}
