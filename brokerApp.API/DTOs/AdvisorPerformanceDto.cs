namespace brokerApp.API.DTOs;

public class AdvisorPerformanceDto
{
    public int AdvisorId { get; set; }
    public string AdvisorName { get; set; } = string.Empty;
    public List<WeeklyStatsDto> WeeklyStats { get; set; } = new();
}

public class WeeklyStatsDto
{
    public DateTime WeekStarting { get; set; }
    public string WeekLabel { get; set; } = string.Empty;
    public int SubmissionCount { get; set; }
    public decimal TotalPremium { get; set; }
}
