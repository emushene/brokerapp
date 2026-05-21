namespace brokerApp.API.DTOs;

public class AdvisorGroupDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<int> MemberIds { get; set; } = new List<int>();
    public List<AdvisorDto>? Members { get; set; }
}
