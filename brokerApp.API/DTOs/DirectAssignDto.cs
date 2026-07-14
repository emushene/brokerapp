namespace brokerApp.API.DTOs;

public class DirectAssignDto
{
    public List<int> SelectedAdvisorIds { get; set; } = new();
    public int? AdvisorGroupId { get; set; }
}
